'use client';

import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { markPhoneVerified } from '@/lib/session';

interface OtpFormProps {
  email: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function OtpForm({ email, onBack, onSuccess }: OtpFormProps) {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const handleSendOtp = async () => {
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: email }), // email might contain phone
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send OTP');
      }

      setCodeSent(true);
      setMessage(isEn ? 'Code sent! Check your SMS or email.' : 'Code envoye ! Verifiez vos SMS ou emails.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isEn ? 'Failed to send OTP' : 'Echec de l\'envoi du code');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setError(isEn ? 'Please enter the verification code.' : 'Veuillez saisir le code de verification.');
      return;
    }
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: email, code: otp }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Invalid code');
      }

      markPhoneVerified();
      setMessage(isEn ? 'Email verified! Redirecting...' : 'Email verifie ! Redirection...');
      setTimeout(onSuccess, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isEn ? 'Verification failed' : 'Echec de la verification');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const compactInputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 outline-none transition-all duration-200 text-sm hover:border-gray-400 focus:shadow-[0_0_0_4px_rgba(218,119,86,0.15)]';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">
          {isEn ? 'Verify your identity' : 'Verifiez votre identite'}
        </h2>
        <p className="text-base text-gray-600">
          {isEn ? 'Enter the verification code sent to your phone or email.' : 'Entrez le code de verification envoye a votre telephone ou email.'}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-sm font-bold text-blue-700">{email}</p>
      </div>

      {!codeSent ? (
        <button
          onClick={handleSendOtp}
          disabled={isSubmitting}
          className="w-full bg-[#DA7756] text-white font-bold py-3.5 rounded-xl hover:bg-[#C4623F] transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0 text-[15px]"
        >
          {isSubmitting
            ? isEn
              ? 'Sending code...'
              : 'Envoi du code...'
            : isEn
              ? 'Send verification code'
              : 'Envoyer le code de verification'}
        </button>
      ) : (
        <>
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">
              {isEn ? 'Verification code' : 'Code de verification'}
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              className={compactInputClass}
            />
          </div>

          <button
            onClick={handleVerifyOtp}
            disabled={isSubmitting}
            className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0 text-[15px]"
          >
            {isSubmitting
              ? isEn
                ? 'Verifying...'
                : 'Verification...'
              : isEn
                ? 'Verify'
                : 'Verifier'}
          </button>

          <button
            onClick={handleSendOtp}
            disabled={isSubmitting}
            className="w-full text-sm font-bold text-gray-600 hover:text-gray-900 py-2 transition"
          >
            {isEn ? 'Resend code' : 'Renvoyer le code'}
          </button>
        </>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-green-700">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-red-500 text-sm mt-0.5">⚠️</span>
          <p className="text-sm font-bold text-red-700">{error}</p>
        </div>
      )}

      {/* Back button */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-center">
        <button onClick={onBack} className="text-sm text-gray-600 font-medium hover:text-gray-900">
          ← {isEn ? 'Back to login' : 'Retour a la connexion'}
        </button>
      </div>
    </div>
  );
}
