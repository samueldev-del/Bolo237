"use client";

import { useMemo, useState } from 'react';
import { createAppFeedback } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';

function StarButton({
  active,
  onClick,
  onEnter,
  onLeave,
}: {
  active: boolean;
  onClick: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="text-3xl leading-none transition-transform hover:scale-110"
      aria-label="Rate star"
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

  const visualRating = useMemo(() => (hoverRating || rating), [hoverRating, rating]);

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
        const raw = localStorage.getItem('237jobs-user');
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

      setMessage(isEn ? 'Thank you for your feedback.' : 'Merci pour votre retour.');
      setRating(0);
      setHoverRating(0);
      setComment('');
      setTimeout(() => setOpen(false), 700);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessage((isEn ? 'Submit failed: ' : 'Echec envoi: ') + msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[80] rounded-full bg-black text-white px-4 py-3 shadow-xl hover:bg-gray-900 transition font-extrabold text-sm"
      >
        {isEn ? 'Give feedback' : 'Donner mon avis'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-gray-900">
                {isEn ? 'Your feedback on 237jobs' : 'Votre avis sur 237jobs'}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
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
                  active={n <= visualRating}
                  onClick={() => setRating(n)}
                  onEnter={() => setHoverRating(n)}
                  onLeave={() => setHoverRating(0)}
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
                onClick={() => setOpen(false)}
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
      )}
    </>
  );
}
