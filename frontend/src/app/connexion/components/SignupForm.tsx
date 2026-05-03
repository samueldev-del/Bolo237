'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { createUser, loginUser, ApiError } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { markRecentAuthSuccess, storeAuthenticatedUser } from '@/lib/session';

export type SignupRole = 'chercheur' | 'entreprise' | 'artisan';
type Role = SignupRole | 'admin';

const SIGNUP_HONEYPOT_FIELD = 'website';

const ROLE_MAP: Record<SignupRole, string> = {
  chercheur: 'CANDIDAT',
  entreprise: 'ENTREPRISE',
  artisan: 'ARTISAN',
};

const BACKEND_ROLE_TO_LOCAL: Record<string, Role> = {
  CANDIDAT: 'chercheur',
  ENTREPRISE: 'entreprise',
  ARTISAN: 'artisan',
  ADMIN: 'admin',
  SUPER_ADMIN: 'admin',
};

function toLocalRole(role: string | null | undefined): Role {
  const normalizedRole = String(role || '').trim().toUpperCase();
  return BACKEND_ROLE_TO_LOCAL[normalizedRole] || 'chercheur';
}

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

interface SignupFormProps {
  onBack: () => void;
  onSuccess: (email: string) => void;
  role?: SignupRole;
  onRoleChange?: (role: SignupRole) => void;
}

const roleConfig = {
  chercheur: {
    icon: '👤',
    subtitle: 'Candidat',
  },
  entreprise: {
    icon: '🏢',
    subtitle: 'Entreprise',
  },
  artisan: {
    icon: '🛠️',
    subtitle: 'Artisan',
  },
};

export default function SignupForm({ onBack, onSuccess, role, onRoleChange }: SignupFormProps) {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const [internalRole, setInternalRole] = useState<SignupRole>('chercheur');
  const selectedRole = role ?? internalRole;
  const setSelectedRole = (next: SignupRole) => {
    if (onRoleChange) onRoleChange(next);
    else setInternalRole(next);
  };
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryPhoneOption['code']>('CM');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [honeypotValue, setHoneypotValue] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCountry = COUNTRY_PHONE_OPTIONS.find((country) => country.code === selectedCountryCode) || COUNTRY_PHONE_OPTIONS[0];
  const cleanedLocalPhone = phone.replace(/\D/g, '');
  const internationalPhone = `${selectedCountry.dialCode}${cleanedLocalPhone}`;

  const handleSignup = async () => {
    if (!lastName.trim() || !firstName.trim()) {
      setError(isEn ? 'Last name and first name are required.' : 'Le nom et le prenom sont obligatoires.');
      return;
    }
    if (!cleanedLocalPhone || cleanedLocalPhone.length < 6 || cleanedLocalPhone.length > 14) {
      setError(isEn ? 'Valid phone number required.' : 'Numero de telephone valide requis.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError(isEn ? 'Password must be at least 6 characters.' : 'Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError(isEn ? 'Passwords do not match.' : 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (selectedRole === 'entreprise' && !companyName.trim()) {
      setError(isEn ? 'Company name is required.' : 'Le nom de l\'entreprise est obligatoire.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const fullName = selectedRole === 'entreprise'
        ? `${companyName.trim()} — ${firstName.trim()} ${lastName.trim()}`
        : `${firstName.trim()} ${lastName.trim()}`;

      await createUser({
        email: email.trim() || undefined,
        password: password,
        name: fullName,
        role: ROLE_MAP[selectedRole],
        phone: internationalPhone,
        website: honeypotValue,
      });

      // Open secure HttpOnly session cookie immediately after signup.
      const loggedUser = await loginUser({
        identifier: email.trim() || internationalPhone,
        password,
      });

      if (typeof window !== 'undefined') {
        const localRole = toLocalRole(loggedUser.role);
        storeAuthenticatedUser(loggedUser, { role: localRole, phoneVerified: true });
        markRecentAuthSuccess();
        trackEvent('signup_success', { role: ROLE_MAP[selectedRole] });
        onSuccess(email.trim() || internationalPhone);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          isEn
            ? 'This email or phone number is already linked to an account. Please log in instead.'
            : 'Cet email ou numéro de téléphone est déjà associé à un compte. Veuillez vous connecter.'
        );
      } else {
        const message = err instanceof Error ? err.message : (isEn ? 'Account creation failed.' : 'Echec de la creation du compte.');
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const compactInputClass = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 outline-none transition-all duration-200 text-sm hover:border-gray-400 focus:shadow-[0_0_0_4px_rgba(218,119,86,0.15)]';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">{isEn ? 'Create your account' : 'Creer votre compte'}</h2>
        <p className="text-base text-gray-600">
          {isEn ? 'One simple form, instant access to your dashboard.' : 'Un formulaire unique, acces instantane a votre dashboard.'}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {isEn ? 'I am a...' : 'Je suis...'}
        </p>
        <div role="radiogroup" aria-label={isEn ? 'Account type' : 'Type de compte'} className="grid grid-cols-3 gap-2.5">
          {(Object.keys(roleConfig) as SignupRole[]).map((roleKey) => {
            const cfg = roleConfig[roleKey];
            const active = selectedRole === roleKey;
            const accent =
              roleKey === 'entreprise'
                ? 'border-blue-500 bg-blue-50 ring-blue-200'
                : roleKey === 'artisan'
                  ? 'border-amber-500 bg-amber-50 ring-amber-200'
                  : 'border-[#DA7756] bg-[#FFF5EF] ring-[#F5C5A3]';
            return (
              <button
                key={roleKey}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedRole(roleKey)}
                className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  active
                    ? `${accent} shadow-sm ring-4`
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className={`text-2xl transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`} aria-hidden="true">
                  {cfg.icon}
                </span>
                <span className={`text-xs font-bold ${active ? 'text-gray-900' : 'text-gray-700'}`}>
                  {cfg.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Last name' : 'Nom'} *</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            className={compactInputClass}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'First name' : 'Prenom'} *</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            className={compactInputClass}
          />
        </div>
      </div>

      {selectedRole === 'entreprise' && (
        <div>
          <label className="text-xs font-bold text-blue-600 mb-1 block">{isEn ? 'Company name' : 'Nom de l\'entreprise'} *</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder={isEn ? 'Your company name' : 'Nom de votre entreprise'}
            className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200 text-[15px] bg-blue-50/30 hover:border-blue-400 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.16)]"
          />
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Phone number' : 'Numero de telephone'} *</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedCountryCode}
            onChange={(e) => setSelectedCountryCode(e.target.value as CountryPhoneOption['code'])}
            className="w-full max-w-[170px] px-2 sm:px-3 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#DA7756] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 outline-none transition-all duration-200 hover:border-gray-400 shrink-0"
          >
            {COUNTRY_PHONE_OPTIONS.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.dialCode}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d\s()-]/g, ''))}
            autoComplete="tel"
            inputMode="tel"
            placeholder={selectedCountry.placeholder}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] outline-none transition-all duration-200 text-[15px] hover:border-gray-400 focus:shadow-[0_0_0_4px_rgba(218,119,86,0.15)]"
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          {isEn ? 'This phone number is your main sign-in identifier.' : 'Ce numero est votre identifiant principal de connexion.'}
        </p>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-600 mb-1 block">
          Email <span className="text-gray-400">({isEn ? 'optional' : 'optionnel'})</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          placeholder="nom@email.com"
          className={compactInputClass}
        />
      </div>

      <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="signup-website">Website</label>
        <input
          id="signup-website"
          name={SIGNUP_HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypotValue}
          onChange={(e) => setHoneypotValue(e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Password' : 'Mot de passe'} *</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={isEn ? '6 characters minimum' : '6 caracteres minimum'}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] outline-none transition-all duration-200 text-[15px] pr-12 hover:border-gray-400 focus:shadow-[0_0_0_4px_rgba(218,119,86,0.15)]"
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
          {isEn ? 'Confirm password' : 'Confirmer le mot de passe'} *
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
        onClick={handleSignup}
        disabled={isSubmitting}
        className={`w-full text-white font-bold py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg shadow-md text-[15px] disabled:opacity-60 disabled:hover:translate-y-0 ${
          selectedRole === 'entreprise'
            ? 'bg-blue-600 hover:bg-blue-700'
            : selectedRole === 'artisan'
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-[#DA7756] hover:bg-[#C4623F]'
        }`}
      >
        {isSubmitting
          ? isEn
            ? 'Creating account...'
            : 'Creation du compte...'
          : isEn
            ? 'Sign up'
            : 'S\'inscrire'}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-red-500 text-sm mt-0.5">⚠️</span>
          <p className="text-sm font-bold text-red-700">{error}</p>
        </div>
      )}

      {/* Toggle bottom */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-center">
        <p className="text-sm text-gray-600 font-medium">
          {isEn ? 'Already have an account? ' : 'Deja un compte ? '}
          <button onClick={onBack} className="text-[#C4623F] font-bold hover:underline">
            {isEn ? 'Sign in' : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  );
}
