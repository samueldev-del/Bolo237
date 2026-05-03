"use client";

import { useState, useMemo } from 'react';
import { createUserReview } from '@/lib/api';

type RatingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reviewedId: number;
  reviewedName: string;
  isEn: boolean;
  onSuccess?: () => void;
};

export default function RatingModal({ isOpen, onClose, reviewedId, reviewedName, isEn, onSuccess }: RatingModalProps) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [sending, setSending] = useState(false);

  const activeStars = useMemo(() => hover || rating, [hover, rating]);

  const handleSubmit = async () => {
    if (!comment.trim() || comment.trim().length < 3) {
      setMessage(isEn ? 'Please write a short review comment.' : 'Veuillez ecrire un court commentaire.');
      setMessageType('error');
      return;
    }

    setSending(true);
    setMessage('');
    setMessageType('');

    try {
      await createUserReview({
        reviewedId,
        rating,
        comment: comment.trim(),
      });

      setMessage(isEn ? 'Review sent successfully!' : 'Avis envoye avec succes !');
      setMessageType('success');
      setComment('');
      setRating(5);
      setHover(0);

      onSuccess?.();

      setTimeout(() => {
        onClose();
        setMessage('');
        setMessageType('');
      }, 1500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessage((isEn ? 'Review failed: ' : 'Echec avis: ') + msg);
      setMessageType('error');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-extrabold text-gray-900 mb-1">
          {isEn ? 'Leave a review' : 'Laisser un avis'}
        </h3>
        <p className="text-sm text-gray-600 mb-5">
          {reviewedName}
        </p>

        <p className="text-sm font-bold text-gray-700 mb-2">{isEn ? 'Your rating' : 'Votre note'}</p>
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="text-3xl leading-none flex items-center justify-center min-h-[44px] min-w-[44px] p-1 active:scale-[0.98] transition"
              aria-label={isEn ? `Rate ${n} ${n === 1 ? 'star' : 'stars'}` : `Note ${n} ${n === 1 ? 'étoile' : 'étoiles'}`}
              aria-pressed={n === rating}
            >
              <span className={n <= activeStars ? 'text-amber-400' : 'text-gray-300'}>★</span>
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={isEn ? 'Describe your experience...' : 'Decrivez votre experience...'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
        />

        {message && (
          <p className={`text-xs font-bold mb-3 ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={sending}
            className="px-5 py-2.5 rounded-xl bg-black text-white text-sm font-extrabold disabled:opacity-60 hover:bg-gray-800 transition"
          >
            {sending ? (isEn ? 'Sending...' : 'Envoi...') : (isEn ? 'Submit' : 'Envoyer')}
          </button>
          <button
            onClick={onClose}
            disabled={sending}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-extrabold text-gray-700 hover:border-gray-400 transition"
          >
            {isEn ? 'Cancel' : 'Annuler'}
          </button>
        </div>
      </div>
    </div>
  );
}
