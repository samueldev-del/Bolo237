"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAppFeedback } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

const AUTO_OPEN_DELAY_MS = 10 * 60 * 1000;
const SUBMISSION_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const FEEDBACK_AUTO_PROMPTED_SESSION_KEY = 'bolo237-feedback-auto-prompted';
const FEEDBACK_SUBMITTED_AT_KEY = 'bolo237-feedback-submitted-at';
const FEEDBACK_DISMISSED_AT_KEY = 'bolo237-feedback-dismissed-at';

function StarButton({
  value,
  active,
  selected,
  onClick,
  onEnter,
  onLeave,
  isEn,
}: {
  value: number;
  active: boolean;
  selected: boolean;
  onClick: () => void;
  onEnter: () => void;
  onLeave: () => void;
  isEn: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="text-3xl leading-none flex items-center justify-center min-h-[44px] min-w-[44px] transition-transform hover:scale-110 active:scale-[0.98]"
      aria-label={isEn ? `Rate ${value} ${value === 1 ? 'star' : 'stars'}` : `Note ${value} ${value === 1 ? 'étoile' : 'étoiles'}`}
      aria-pressed={selected}
    >
      <span className={active ? 'text-amber-400' : 'text-gray-300'}>★</span>
    </button>
  );
}

export default function AppFeedbackWidget() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const timerRef = useRef<number | null>(null);
  const visibleStartedAtRef = useRef<number | null>(null);
  const remainingMsRef = useRef(AUTO_OPEN_DELAY_MS);

  const visualRating = useMemo(() => (hoverRating || rating), [hoverRating, rating]);

  const shouldAutoPrompt = useCallback(() => {
    if (typeof window === 'undefined') return false;

    if (window.sessionStorage.getItem(FEEDBACK_AUTO_PROMPTED_SESSION_KEY) === '1') {
      return false;
    }

    const now = Date.now();
    const submittedAt = Number(window.localStorage.getItem(FEEDBACK_SUBMITTED_AT_KEY) || 0);
    if (submittedAt && now - submittedAt < SUBMISSION_COOLDOWN_MS) {
      return false;
    }

    const dismissedAt = Number(window.localStorage.getItem(FEEDBACK_DISMISSED_AT_KEY) || 0);
    if (dismissedAt && now - dismissedAt < DISMISS_COOLDOWN_MS) {
      return false;
    }

    return true;
  }, []);

  const clearPromptTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const openPrompt = useCallback(() => {
    if (typeof window === 'undefined' || !shouldAutoPrompt()) return;

    window.sessionStorage.setItem(FEEDBACK_AUTO_PROMPTED_SESSION_KEY, '1');
    setSubmitted(false);
    setMessage('');
    setOpen(true);
  }, [shouldAutoPrompt]);

  const schedulePrompt = useCallback(() => {
    if (typeof window === 'undefined' || open || document.hidden || !shouldAutoPrompt()) {
      return;
    }

    clearPromptTimer();
    visibleStartedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      visibleStartedAtRef.current = null;
      remainingMsRef.current = 0;
      openPrompt();
    }, remainingMsRef.current);
  }, [clearPromptTimer, open, openPrompt, shouldAutoPrompt]);

  const closeModal = useCallback((rememberDismissal = true) => {
    setOpen(false);
    if (typeof window !== 'undefined' && rememberDismissal && !submitted) {
      window.localStorage.setItem(FEEDBACK_DISMISSED_AT_KEY, String(Date.now()));
    }
  }, [submitted]);

  useEffect(() => {
    if (typeof window === 'undefined' || !shouldAutoPrompt()) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (visibleStartedAtRef.current) {
          const elapsed = Date.now() - visibleStartedAtRef.current;
          remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
        }
        visibleStartedAtRef.current = null;
        clearPromptTimer();
        return;
      }

      if (remainingMsRef.current <= 0) {
        openPrompt();
        return;
      }

      schedulePrompt();
    };

    schedulePrompt();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearPromptTimer();
    };
  }, [clearPromptTimer, openPrompt, schedulePrompt, shouldAutoPrompt]);

  const onSubmit = async () => {
    if (rating < 1) {
      setMessage(isEn ? 'Please choose a rating.' : 'Veuillez choisir une note.');
      return;
    }
    if (comment.trim().length < 3) {
      setMessage(isEn ? 'Please write a short comment.' : 'Veuillez ecrire un court commentaire.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      let userId = 0;
      let authorName = '';
      try {
        const raw = localStorage.getItem('bolo237-user');
        if (raw) {
          const user = JSON.parse(raw);
          userId = Number(user?.id || 0);
          authorName = String(user?.name || user?.fullName || user?.email || '').trim();
        }
      } catch {
        // ignore local storage parse issues
      }

      await createAppFeedback({
        userId: userId || undefined,
        authorName: authorName || undefined,
        rating,
        comment: comment.trim(),
      });

      setSubmitted(true);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(FEEDBACK_SUBMITTED_AT_KEY, String(Date.now()));
      }
      setMessage(isEn ? 'Thank you for your feedback.' : 'Merci pour votre retour.');
      setRating(0);
      setHoverRating(0);
      setComment('');
      setTimeout(() => closeModal(false), 700);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessage((isEn ? 'Submit failed: ' : 'Echec envoi: ') + msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    open ? (
      <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-extrabold text-gray-900">
              {isEn ? 'Your feedback on Bolo237' : 'Votre avis sur Bolo237'}
            </h3>
            <button
              onClick={() => closeModal()}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              aria-label={isEn ? 'Close feedback popup' : 'Fermer la fenetre d avis'}
            >
              ×
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            {isEn ? 'How would you rate your experience?' : 'Comment notez-vous votre experience ?'}
          </p>

          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <StarButton
                key={n}
                value={n}
                active={n <= visualRating}
                selected={n === rating}
                onClick={() => setRating(n)}
                onEnter={() => setHoverRating(n)}
                onLeave={() => setHoverRating(0)}
                isEn={isEn}
              />
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder={isEn ? 'Tell us what you like or what to improve...' : 'Dites-nous ce que vous aimez ou ce qu il faut ameliorer...'}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 resize-none"
          />

          {message && (
            <p className={`mt-3 text-xs font-bold ${message.toLowerCase().includes('echec') || message.toLowerCase().includes('failed') ? 'text-red-600' : 'text-emerald-700'}`}>
              {message}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => closeModal()}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              onClick={onSubmit}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-sm font-extrabold text-gray-900"
            >
              {busy ? (isEn ? 'Sending...' : 'Envoi...') : (isEn ? 'Submit' : 'Envoyer')}
            </button>
          </div>
        </div>
      </div>
    ) : null
  );
}
