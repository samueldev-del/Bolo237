"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  fetchAdminInboxSummary,
  type AdminInboxSummary,
  type AdminInboxSync,
} from "@/lib/api";

type InboxSnapshot = {
  summary: AdminInboxSummary;
  sync: AdminInboxSync;
};

type BrowserPermission = NotificationPermission | "unsupported";

type AdminInboxContextValue = {
  summary: AdminInboxSummary | null;
  sync: AdminInboxSync | null;
  isLoading: boolean;
  notificationPermission: BrowserPermission;
  refreshSummary: (options?: { force?: boolean; silent?: boolean; notify?: boolean }) => Promise<void>;
  hydrateSnapshot: (snapshot: InboxSnapshot, options?: { notify?: boolean }) => void;
  requestNotificationPermission: () => Promise<BrowserPermission>;
};

const AdminInboxContext = createContext<AdminInboxContextValue | null>(null);

function getInitialPermission(): BrowserPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export function AdminInboxProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<AdminInboxSummary | null>(null);
  const [sync, setSync] = useState<AdminInboxSync | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<BrowserPermission>(getInitialPermission);
  const previousUnreadRef = useRef<number | null>(null);

  const applySnapshot = useCallback((snapshot: InboxSnapshot, options?: { notify?: boolean }) => {
    startTransition(() => {
      setSummary(snapshot.summary);
      setSync(snapshot.sync);
    });

    const previousUnread = previousUnreadRef.current;
    const nextUnread = snapshot.summary.unreadCount;
    const canNotify =
      options?.notify !== false &&
      previousUnread !== null &&
      nextUnread > previousUnread &&
      typeof window !== "undefined" &&
      document.visibilityState !== "visible" &&
      "Notification" in window &&
      Notification.permission === "granted";

    if (canNotify) {
      const delta = nextUnread - previousUnread;
      const title = delta > 1 ? `${delta} nouveaux emails` : "Nouveau email";
      const body =
        delta > 1
          ? `Vous avez ${nextUnread} emails non lus dans la boite Hostinger.`
          : "Un nouvel email est arrive dans la boite Hostinger.";

      new Notification(title, {
        body,
        tag: "bolo237-admin-inbox",
      });
    }

    previousUnreadRef.current = nextUnread;
  }, []);

  const refreshSummary = useCallback(
    async (options: { force?: boolean; silent?: boolean; notify?: boolean } = {}) => {
      if (!options.silent) {
        setIsLoading(true);
      }

      try {
        const snapshot = await fetchAdminInboxSummary({ force: options.force });
        applySnapshot(snapshot, { notify: options.notify });
      } finally {
        if (!options.silent) {
          setIsLoading(false);
        }
      }
    },
    [applySnapshot],
  );

  useEffect(() => {
    void refreshSummary({ notify: false });

    const intervalId = window.setInterval(() => {
      void refreshSummary({ silent: true, notify: true });
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshSummary]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const syncPermission = () => {
      setNotificationPermission(Notification.permission);
    };

    window.addEventListener("focus", syncPermission);
    return () => {
      window.removeEventListener("focus", syncPermission);
    };
  }, []);

  const hydrateSnapshot = useCallback((snapshot: InboxSnapshot, options?: { notify?: boolean }) => {
    applySnapshot(snapshot, options);
    setIsLoading(false);
  }, [applySnapshot]);

  const requestNotificationPermission = useCallback(async (): Promise<BrowserPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return "unsupported";
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  }, []);

  return (
    <AdminInboxContext.Provider
      value={{
        summary,
        sync,
        isLoading,
        notificationPermission,
        refreshSummary,
        hydrateSnapshot,
        requestNotificationPermission,
      }}
    >
      {children}
    </AdminInboxContext.Provider>
  );
}

export function useAdminInbox() {
  const context = useContext(AdminInboxContext);
  if (!context) {
    throw new Error("useAdminInbox doit etre utilise dans AdminInboxProvider.");
  }

  return context;
}