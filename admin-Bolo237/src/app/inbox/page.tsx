"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  Download,
  FileText,
  Inbox,
  Loader2,
  MailOpen,
  Paperclip,
  RefreshCw,
  Reply,
} from "lucide-react";
import AdminShell from "@/components/admin/admin-shell";
import { useAdminInbox } from "@/components/admin/admin-inbox-provider";
import {
  downloadAdminEmailAttachment,
  fetchAdminInbox,
  markAdminEmailAsRead,
  replyToAdminEmail,
  type AdminEmailAttachment,
  type AdminEmail,
} from "@/lib/api";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

type Notice = {
  tone: "info" | "success" | "error";
  message: string;
};

function getPreview(body: string) {
  return body.replace(/\s+/g, " ").trim().slice(0, 160) || "Apercu indisponible.";
}

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "Taille inconnue";

  const units = ["o", "Ko", "Mo", "Go"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatMessageDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date inconnue";
  return dateFormatter.format(parsed);
}

function getStatusClasses(status: AdminEmail["status"]) {
  if (status === "UNREAD") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (status === "REPLIED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function getStatusLabel(status: AdminEmail["status"]) {
  if (status === "UNREAD") return "Non lu";
  if (status === "REPLIED") return "Repondu";
  return "Lu";
}

export default function AdminInboxPage() {
  const {
    summary,
    sync,
    hydrateSnapshot,
    notificationPermission,
    refreshSummary,
    requestNotificationPermission,
  } = useAdminInbox();
  const [emails, setEmails] = useState<AdminEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [downloadingPart, setDownloadingPart] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const selectedEmail = emails.find((item) => item.id === selectedEmailId) ?? emails[0] ?? null;

  const loadInbox = useCallback(
    async (options: { force?: boolean; silent?: boolean; notify?: boolean } = {}) => {
      if (options.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const snapshot = await fetchAdminInbox({ force: options.force, limit: 120 });
        setEmails(snapshot.items);
        hydrateSnapshot(
          {
            summary: snapshot.summary,
            sync: snapshot.sync,
          },
          { notify: options.notify },
        );

        setSelectedEmailId((currentId) => {
          if (snapshot.items.length === 0) return null;
          if (currentId && snapshot.items.some((item) => item.id === currentId)) return currentId;
          return snapshot.items[0].id;
        });
      } catch (error) {
        setNotice({
          tone: "error",
          message: error instanceof Error ? error.message : "Impossible de charger la boite de reception.",
        });
      } finally {
        if (options.silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [hydrateSnapshot],
  );

  useEffect(() => {
    void loadInbox({ notify: false });

    const intervalId = window.setInterval(() => {
      void loadInbox({ silent: true, notify: true });
    }, 75_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadInbox]);

  async function handleSelectEmail(email: AdminEmail) {
    setSelectedEmailId(email.id);

    if (email.status !== "UNREAD") {
      return;
    }

    try {
      const result = await markAdminEmailAsRead(email.id);
      setEmails((current) =>
        current.map((item) => (item.id === email.id ? { ...item, status: result.item.status } : item)),
      );
      await refreshSummary({ silent: true, notify: false });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Impossible de marquer ce message comme lu.",
      });
    }
  }

  async function handleReply() {
    if (!selectedEmail || !replyMessage.trim()) {
      return;
    }

    setSendingReply(true);
    setNotice(null);

    try {
      const result = await replyToAdminEmail({
        ticketId: selectedEmail.id,
        replyMessage: replyMessage.trim(),
        customerEmail: selectedEmail.senderEmail,
        subject: selectedEmail.subject,
      });

      setEmails((current) =>
        current.map((item) =>
          item.id === selectedEmail.id
            ? {
                ...item,
                status: result.item?.status ?? "REPLIED",
                updatedAt: result.item?.updatedAt ?? item.updatedAt,
              }
            : item,
        ),
      );
      setReplyMessage("");
      setNotice({
        tone: result.warning ? "info" : "success",
        message: result.message,
      });
      await refreshSummary({ force: true, silent: true, notify: false });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Envoi impossible.",
      });
    } finally {
      setSendingReply(false);
    }
  }

  async function handleManualSync() {
    setNotice(null);
    await loadInbox({ force: true, silent: true, notify: false });
  }

  async function handleEnableNotifications() {
    const permission = await requestNotificationPermission();

    if (permission === "granted") {
      setNotice({
        tone: "success",
        message: "Notifications navigateur activees pour la boite de reception.",
      });
      return;
    }

    if (permission === "denied") {
      setNotice({
        tone: "info",
        message: "Le navigateur a bloque les notifications. Autorise-les dans les reglages du site.",
      });
      return;
    }

    if (permission === "unsupported") {
      setNotice({
        tone: "info",
        message: "Les notifications navigateur ne sont pas disponibles dans cet environnement.",
      });
    }
  }

  async function handleDownloadAttachment(attachment: AdminEmailAttachment) {
    if (!selectedEmail) {
      return;
    }

    setDownloadingPart(attachment.part);

    try {
      const blob = await downloadAdminEmailAttachment(selectedEmail.id, attachment.part);
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Impossible de telecharger la piece jointe.",
      });
    } finally {
      setDownloadingPart(null);
    }
  }

  return (
    <AdminShell
      title="Boite de reception Hostinger"
      description="Lecture, suivi et reponse aux emails reels synchronises depuis votre mailbox."
    >
      <div className="space-y-6">
        {notice ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              notice.tone === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : notice.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        {sync?.lastError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Synchronisation Hostinger indisponible: {sync.lastError}
          </div>
        ) : null}

        {!sync?.enabled ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Configure EMAIL_IMAP_USER et EMAIL_IMAP_PASS dans le backend, ou reutilise EMAIL_USER et EMAIL_PASS si la meme boite Hostinger sert pour SMTP et IMAP.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Non lus</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-900">{summary?.unreadCount ?? 0}</p>
              <p className="mt-1 text-sm text-zinc-500">Messages a traiter</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Reponses</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-900">{summary?.repliedCount ?? 0}</p>
              <p className="mt-1 text-sm text-zinc-500">Conversations cloturees</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Mailbox</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-900">{sync?.totalInMailbox ?? summary?.totalCount ?? 0}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {sync?.lastSyncedAt ? `Derniere sync ${formatMessageDate(sync.lastSyncedAt)}` : "En attente de synchro"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={() => void handleManualSync()}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Synchroniser
            </button>
            <button
              type="button"
              onClick={() => void handleEnableNotifications()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8B4332] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7A3A2B]"
            >
              <BellRing className="h-4 w-4" />
              {notificationPermission === "granted" ? "Notifications actives" : "Activer notifications"}
            </button>
          </div>
        </div>

        <div className="grid min-h-[640px] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-4 py-4">
              <p className="text-sm font-semibold text-zinc-900">Inbox</p>
              <p className="text-xs text-zinc-500">
                {emails.length} conversation{emails.length > 1 ? "s" : ""} chargee{emails.length > 1 ? "s" : ""}
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[480px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#8B4332]" />
              </div>
            ) : emails.length === 0 ? (
              <div className="flex min-h-[480px] flex-col items-center justify-center px-6 text-center">
                <Inbox className="h-10 w-10 text-zinc-300" />
                <p className="mt-3 text-sm font-medium text-zinc-700">La boite de reception est vide.</p>
                <p className="mt-1 text-sm text-zinc-500">Les nouveaux emails Hostinger apparaitront ici apres synchronisation.</p>
              </div>
            ) : (
              <div className="max-h-[720px] overflow-y-auto">
                {emails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;

                  return (
                    <button
                      key={email.id}
                      type="button"
                      onClick={() => void handleSelectEmail(email)}
                      className={`w-full border-b border-zinc-200 px-4 py-4 text-left transition last:border-b-0 ${
                        isSelected ? "bg-[#FFF7F2]" : "bg-white hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`truncate text-sm font-semibold ${email.status === "UNREAD" ? "text-zinc-950" : "text-zinc-800"}`}>
                              {email.senderName || email.senderEmail}
                            </p>
                            {email.status === "UNREAD" ? <span className="h-2.5 w-2.5 rounded-full bg-[#DA7756]" /> : null}
                          </div>
                          <p className="truncate text-xs text-zinc-500">{email.senderEmail}</p>
                        </div>
                        <p className="shrink-0 text-xs text-zinc-500">{formatMessageDate(email.createdAt)}</p>
                      </div>

                      <p className="mt-3 truncate text-sm font-medium text-zinc-800">{email.subject || "Sans sujet"}</p>
                      <p className="mt-1 text-sm text-zinc-500">{getPreview(email.body)}</p>

                      {email.attachments.length > 0 ? (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                          <Paperclip className="h-3.5 w-3.5" />
                          {email.attachments.length} piece{email.attachments.length > 1 ? "s" : ""} jointe{email.attachments.length > 1 ? "s" : ""}
                        </div>
                      ) : null}

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(email.status)}`}>
                          {getStatusLabel(email.status)}
                        </span>
                        <span className="text-xs text-zinc-400">Message #{email.id}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex min-h-[640px] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            {selectedEmail ? (
              <>
                <div className="border-b border-zinc-200 px-6 py-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <MailOpen className="h-5 w-5 text-[#8B4332]" />
                        <h2 className="truncate text-xl font-semibold text-zinc-950">
                          {selectedEmail.subject || "Sans sujet"}
                        </h2>
                      </div>
                      <p className="mt-2 text-sm text-zinc-600">
                        De <span className="font-semibold text-zinc-900">{selectedEmail.senderName || selectedEmail.senderEmail}</span>
                        <span className="text-zinc-500"> · {selectedEmail.senderEmail}</span>
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">Recu le {formatMessageDate(selectedEmail.createdAt)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(selectedEmail.status)}`}>
                        {getStatusLabel(selectedEmail.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {selectedEmail.attachments.length > 0 ? (
                    <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                      <div className="mb-4 flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-[#8B4332]" />
                        <p className="text-sm font-semibold text-zinc-900">
                          Pieces jointes ({selectedEmail.attachments.length})
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {selectedEmail.attachments.map((attachment) => (
                          <div
                            key={attachment.part}
                            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#8B4332] shadow-sm">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-zinc-900">{attachment.filename}</p>
                                <p className="mt-1 text-xs text-zinc-500">{attachment.contentType}</p>
                                <p className="text-xs text-zinc-500">{formatBytes(attachment.size)}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => void handleDownloadAttachment(attachment)}
                              disabled={downloadingPart === attachment.part}
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {downloadingPart === attachment.part ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              {downloadingPart === attachment.part ? "Telechargement..." : "Telecharger"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-800">{selectedEmail.body}</p>
                  </div>
                </div>

                <div className="border-t border-zinc-200 bg-white px-6 py-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Repondre depuis l&apos;admin</p>
                      <p className="text-xs text-zinc-500">La reponse part via votre SMTP Hostinger.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyMessage("")}
                      disabled={!replyMessage.trim() || sendingReply}
                      className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Vider
                    </button>
                  </div>

                  <textarea
                    value={replyMessage}
                    onChange={(event) => setReplyMessage(event.target.value)}
                    rows={7}
                    placeholder="Ecris la reponse qui sera envoyee au client..."
                    className="w-full resize-y rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none transition focus:border-[#DA7756] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6]"
                  />

                  <div className="mt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setReplyMessage("")}
                      disabled={sendingReply}
                      className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReply()}
                      disabled={!replyMessage.trim() || sendingReply}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#8B4332] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7A3A2B] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Reply className="h-4 w-4" />}
                      {sendingReply ? "Envoi..." : "Envoyer la reponse"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[640px] flex-col items-center justify-center px-6 text-center">
                <Inbox className="h-10 w-10 text-zinc-300" />
                <p className="mt-3 text-base font-semibold text-zinc-800">Aucun email selectionne</p>
                <p className="mt-1 max-w-md text-sm text-zinc-500">
                  Selectionne un message dans la colonne de gauche pour lire son contenu, le marquer comme lu et envoyer une reponse.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}