'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';
import { getStoredUser, subscribeToSessionStorage } from '@/lib/session';

interface ApplyButtonProps {
  externalApplyUrl?: string | null;
  onInternalApply?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  loadingLabel?: string;
  disabledLabel?: string;
  showHint?: boolean;
  hintClassName?: string;
  children?: ReactNode;
}

const DEFAULT_BUTTON_CLASS =
  'inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F4C81] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#0C3E69] disabled:cursor-not-allowed disabled:bg-slate-300';

const DEFAULT_HINT_CLASS = 'mt-2 text-center text-xs font-medium text-slate-500';

export default function ApplyButton({
  externalApplyUrl,
  onInternalApply,
  disabled,
  loading,
  className,
  loadingLabel,
  disabledLabel,
  showHint = true,
  hintClassName,
  children,
}: ApplyButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  // null = unknown (pre-mount), true/false = resolved.
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => setAuthed(Boolean(getStoredUser()?.id));
    sync();
    return subscribeToSessionStorage(sync);
  }, []);

  const externalUrl = String(externalApplyUrl || '').trim();
  const isAuthed = authed === true;
  const isUnauthed = authed === false;

  const buttonClass = className ?? DEFAULT_BUTTON_CLASS;

  function resolveLabel(): ReactNode {
    if (loading) return loadingLabel ?? (isEn ? 'Sending...' : 'Envoi...');
    if (disabled && disabledLabel) return disabledLabel;
    return children ?? (isEn ? 'Apply' : 'Postuler');
  }

  function redirectToLogin(event: React.MouseEvent) {
    event.preventDefault();
    const redirect = pathname || '/';
    const target = `${localizePath('/connexion')}?redirect=${encodeURIComponent(redirect)}`;
    router.push(target);
  }

  function handleInternalClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (!isAuthed) {
      redirectToLogin(event);
      return;
    }
    if (onInternalApply) onInternalApply();
  }

  // Authenticated + external URL → real anchor that opens in a new tab.
  if (isAuthed && externalUrl) {
    return (
      <div className="flex w-full flex-col">
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          aria-disabled={disabled || loading || undefined}
          onClick={(event) => {
            if (disabled || loading) event.preventDefault();
          }}
        >
          <span>{resolveLabel()}</span>
          <ExternalIcon />
        </a>
      </div>
    );
  }

  // All other cases: a button. If external URL exists but user is unauthed, the
  // click is intercepted and routed to /connexion?redirect=... — we never leak
  // an external href to a logged-out visitor.
  const hasExternal = Boolean(externalUrl);

  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        onClick={hasExternal ? redirectToLogin : handleInternalClick}
        disabled={disabled || loading}
        className={buttonClass}
      >
        <span>{resolveLabel()}</span>
        {hasExternal ? <ExternalIcon /> : null}
      </button>

      {showHint && isUnauthed ? (
        <p className={hintClassName ?? DEFAULT_HINT_CLASS}>
          {isEn
            ? 'Login required to apply.'
            : 'Une connexion est requise pour postuler à cette offre.'}
        </p>
      ) : null}
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h8v8" />
    </svg>
  );
}
