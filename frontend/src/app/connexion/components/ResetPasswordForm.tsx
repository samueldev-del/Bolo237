'use client';

import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { resetPassword } from '@/lib/api';

interface ResetPasswordFormProps {
  onSuccess: () => void;
}

export default function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!phone.trim()) {
      setError(isEn ? 'Please enter your phone number.' : 'Veuillez saisir votre numero de telephone.');
      return;
    }
    if (!code.trim()) {
      setError(isEn ? 'Please enter the verification code.' : 'Veuillez saisir le code de verification.');
      return;
    }
    if (!newPassword.trim()) {
      setError(isEn ? 'Please enter a new password.' : 'Veuillez saisir un nouveau mot de passe.');
      return;
    }
    if (newPassword.length < 6) {
      setError(isEn ? 'Password must be at least 6 characters.' : 'Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(isEn ? 'Passwords do not match.' : 'Les mots de passe ne correspondent pas.');
      return;
    }

    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      await resetPassword({ phone: phone.trim(), code: code.trim(), newPassword });
      setSuccess(true);
      setMessage(
        isEn ? 'Password changed! You can now sign in.' : 'Mot de passe modifie ! Vous pouvez maintenant vous connecter.'
      );
      setTimeout(onSuccess, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isEn ? 'Failed to reset password' : 'Echec de la reinitialisation');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const compactInputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 outline-none transition-all duration-200 text-sm hover:border-gray-400 focus:shadow-[0_0_0_4px_rgba(218,119,86,0.15)]';

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto">✓</div>
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
            {isEn ? 'Success!' : 'Succes !'}
          </h2>
          <p className="text-base text-green-700 font-bold">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">
          {isEn ? 'Set a new password' : 'Definir un nouveau mot de passe'}
        </h2>
        <p className="text-base text-gray-600">
          {isEn ? 'Enter your verification code and new password below.' : 'Entrez votre code de verification et nouveau mot de passe ci-dessous.'}
        </p>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Phone number' : 'Numero de telephone'}</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d\s()-+]/g, ''))}
          autoComplete="tel"
          inputMode="tel"
          placeholder="+237..."
          className={compactInputClass}
        />
      </div>

      <div>
        <label className="text-xs font-bold text-gray-600 mb-1 block">
          {isEn ? 'Verification code' : 'Code de verification'}
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          className={compactInputClass}
        />
      </div>

      <div>
        <label className="text-xs font-bold text-gray-600 mb-1 block">
          {isEn ? 'New password' : 'Nouveau mot de passe'}
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={isEn ? '6 characters minimum' : '6 caracteres minimum'}
            className={`${compactInputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm flex items-center justify-center min-h-[44px] min-w-[44px] active:scale-[0.98] transition"
            aria-label={
              showPassword
                ? isEn
                  ? 'Hide password'
                  : 'Masquer le mot de passe'
                : isEn
                  ? 'Show password'
                  : 'Afficher le mot de passe'
            }
            aria-pressed={showPassword}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-600 mb-1 block">
          {isEn ? 'Confirm password' : 'Confirmer le mot de passe'}
        </label>
        <input
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={isEn ? 'Repeat your password' : 'Repetez votre mot de passe'}
          className={compactInputClass}
        />
      </div>

      <button
        onClick={handleResetPassword}
        disabled={isSubmitting}
        className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0 text-[15px]"
      >
        {isSubmitting
          ? isEn
            ? 'Resetting password...'
            : 'Reinitialisation...'
          : isEn
            ? 'Reset password'
            : 'Reinitialiser le mot de passe'}
      </button>

      {message && !success && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-blue-700">{message}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-red-500 text-sm mt-0.5">⚠️</span>
          <p className="text-sm font-bold text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
