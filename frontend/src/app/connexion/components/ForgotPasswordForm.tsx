'use client';

import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { forgotPassword } from '@/lib/api';

type CountryPhoneOption = {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  placeholder: string;
};

const COUNTRY_PHONE_OPTIONS: CountryPhoneOption[] = [
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237', placeholder: '6XX XX XX XX' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33', placeholder: '6 12 34 56 78' },
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', dialCode: '+49', placeholder: '1512 3456789' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1', placeholder: '514 123 4567' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1', placeholder: '415 123 4567' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', placeholder: '7123 456789' },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', dialCode: '+32', placeholder: '470 12 34 56' },
  { code: 'CH', name: 'Suisse', flag: '🇨🇭', dialCode: '+41', placeholder: '79 123 45 67' },
];

interface ForgotPasswordFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function ForgotPasswordForm({ onBack, onSuccess }: ForgotPasswordFormProps) {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const [phone, setPhone] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryPhoneOption['code']>('CM');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const selectedCountry =
    COUNTRY_PHONE_OPTIONS.find((country) => country.code === selectedCountryCode) || COUNTRY_PHONE_OPTIONS[0];

  const handleSendResetCode = async () => {
    if (!phone.trim()) {
      setError(isEn ? 'Please enter your phone number.' : 'Veuillez saisir votre numero de telephone.');
      return;
    }
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const fullPhone = `${selectedCountry.dialCode}${phone.replace(/\D/g, '')}`;
      await forgotPassword(fullPhone);
      setCodeSent(true);
      setMessage(isEn ? 'Code sent! Check your SMS.' : 'Code envoye ! Verifiez vos SMS.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isEn ? 'Failed to send code' : 'Echec de l\'envoi du code');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">
          {isEn ? 'Reset your password' : 'Reinitialiser le mot de passe'}
        </h2>
        <p className="text-base text-gray-600">
          {isEn
            ? 'Enter the phone number linked to your account. We will send you a verification code.'
            : 'Entrez le numero de telephone lie a votre compte. Nous vous enverrons un code de verification.'}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={selectedCountryCode}
          onChange={(e) => setSelectedCountryCode(e.target.value as CountryPhoneOption['code'])}
          className="w-full max-w-[170px] border border-gray-300 rounded-xl px-2 py-3 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2"
        >
          {COUNTRY_PHONE_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.dialCode}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d\s()-]/g, ''))}
          autoComplete="tel"
          inputMode="tel"
          placeholder={COUNTRY_PHONE_OPTIONS.find((c) => c.code === selectedCountryCode)?.placeholder || '6XX XX XX XX'}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] focus:border-[#DA7756] outline-none transition-all duration-200 text-sm hover:border-gray-400 focus:shadow-[0_0_0_4px_rgba(218,119,86,0.15)]"
        />
      </div>

      <button
        onClick={handleSendResetCode}
        disabled={isSubmitting || codeSent}
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

      {codeSent && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-blue-700">
            {isEn ? 'Code sent! Click below to set a new password.' : 'Code envoye ! Cliquez ci-dessous pour definir un nouveau mot de passe.'}
          </p>
        </div>
      )}

      <button
        onClick={onSuccess}
        disabled={!codeSent}
        className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0 text-[15px]"
      >
        {isEn ? 'Continue to reset' : 'Continuer vers la reinitialisation'}
      </button>

      {/* Back button */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-center">
        <button onClick={onBack} className="text-sm text-gray-600 font-medium hover:text-gray-900">
          ← {isEn ? 'Back to login' : 'Retour a la connexion'}
        </button>
      </div>
    </div>
  );
}
