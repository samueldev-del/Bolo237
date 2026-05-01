"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';
import { createUser, loginUser, forgotPassword, resetPassword, ApiError } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { markRecentAuthSuccess, storeAuthenticatedUser } from '@/lib/session';

type SignupRole = 'chercheur' | 'entreprise' | 'artisan';
type Role = SignupRole | 'admin';
type HeroRole = 'artisan' | 'entreprise' | 'candidat';

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

const AUTH_HERO_BY_ROLE: Record<HeroRole, { image: string; title: string; subtitle: string }> = {
  artisan: {
    image: '/artisant.jpg',
    title: 'Développez votre activité locale',
    subtitle: 'Trouvez de nouveaux chantiers et clients près de chez vous.',
  },
  entreprise: {
    image: '/talent.jpg',
    title: 'Trouvez vos futurs talents',
    subtitle: 'Publiez vos offres et recrutez les meilleurs profils du Cameroun.',
  },
  candidat: {
    image: '/jobsearch.jpg',
    title: 'Donnez un élan à votre carrière',
    subtitle: "Des centaines d'offres d'emploi vous attendent chaque jour.",
  },
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

function ConnexionContent() {
  const { locale, localizePath } = useLocale();
  const searchParams = useSearchParams();
  const isEn = locale === 'en';

  // Mode
  const [isLogin, setIsLogin] = useState(true);

  // Signup fields
  const [selectedRole, setSelectedRole] = useState<SignupRole>('chercheur');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryPhoneOption['code']>('CM');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Entreprise
  const [companyName, setCompanyName] = useState('');
  const [honeypotValue, setHoneypotValue] = useState('');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Reset password
  const [showReset, setShowReset] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetCountryCode, setResetCountryCode] = useState<CountryPhoneOption['code']>('CM');
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // UI
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleFromQuery = searchParams.get('role');
  // In signup mode, mirror the selected role card. In login mode, use the URL param.
  const heroRole: HeroRole = !isLogin
    ? (selectedRole === 'artisan' ? 'artisan' : selectedRole === 'entreprise' ? 'entreprise' : 'candidat')
    : (roleFromQuery === 'artisan' || roleFromQuery === 'entreprise' || roleFromQuery === 'candidat' ? roleFromQuery : 'candidat');
  const hero = AUTH_HERO_BY_ROLE[heroRole];

  const selectedCountry = COUNTRY_PHONE_OPTIONS.find((country) => country.code === selectedCountryCode) || COUNTRY_PHONE_OPTIONS[0];
  const cleanedLocalPhone = phone.replace(/\D/g, '');
  const internationalPhone = `${selectedCountry.dialCode}${cleanedLocalPhone}`;

  useEffect(() => {
    const requestedRole = searchParams.get('role');
    if (requestedRole === 'entreprise' || requestedRole === 'artisan') {
      setSelectedRole(requestedRole);
    } else if (requestedRole === 'chercheur' || requestedRole === 'candidat') {
      setSelectedRole('chercheur');
    }

    const requestedMode = searchParams.get('mode');
    if (requestedMode === 'signup') {
      setIsLogin(false);
    }
    if (requestedMode === 'login') {
      setIsLogin(true);
    }
  }, [searchParams]);

  const getDashboardRoute = (role: Role) => {
    if (role === 'admin') return 'https://admin.bolo237.com';
    if (role === 'entreprise') return localizePath('/dashboard-entreprise');
    if (role === 'artisan') return localizePath('/dashboard-artisan');
    return localizePath('/dashboard');
  };


  // Final signup
  const handleSignup = async () => {
    if (!lastName.trim() || !firstName.trim()) {
      setAuthError(isEn ? 'Last name and first name are required.' : 'Le nom et le prenom sont obligatoires.');
      return;
    }
    if (!cleanedLocalPhone || cleanedLocalPhone.length < 6 || cleanedLocalPhone.length > 14) {
      setAuthError(isEn ? 'Valid phone number required.' : 'Numero de telephone valide requis.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setAuthError(isEn ? 'Password must be at least 6 characters.' : 'Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError(isEn ? 'Passwords do not match.' : 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (selectedRole === 'entreprise' && !companyName.trim()) {
      setAuthError(isEn ? 'Company name is required.' : 'Le nom de l\'entreprise est obligatoire.');
      return;
    }
    setAuthError('');
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
        // Full page reload so the session cookie is properly sent on
        // the very first request the dashboard makes to /api/auth/me.
        // router.push (SPA nav) could trigger the dashboard's session
        // check before the browser has fully committed the cookie.
        window.location.href = getDashboardRoute(localRole);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setAuthError(
          isEn
            ? 'This email or phone number is already linked to an account. Please log in instead.'
            : 'Cet email ou numéro de téléphone est déjà associé à un compte. Veuillez vous connecter.'
        );
      } else {
        const message = err instanceof Error ? err.message : (isEn ? 'Account creation failed.' : 'Echec de la creation du compte.');
        setAuthError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Login
  const handleLogin = async () => {
    if (!loginEmail.trim()) {
      setAuthError(isEn ? 'Please enter your email or phone number.' : 'Veuillez saisir votre email ou numero de telephone.');
      return;
    }
    if (!loginPassword.trim()) {
      setAuthError(isEn ? 'Please enter your password.' : 'Veuillez saisir votre mot de passe.');
      return;
    }
    setAuthError('');
    setIsSubmitting(true);
    try {
      const user = await loginUser({ identifier: loginEmail.trim(), password: loginPassword });
      if (typeof window !== 'undefined') {
        const localRole = toLocalRole(user.role);
        storeAuthenticatedUser(user, { role: localRole, phoneVerified: true });
        markRecentAuthSuccess();
        // Full page reload — same reason as signup above.
        window.location.href = getDashboardRoute(localRole);
        return; // stop here, page is reloading
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isEn ? 'Login failed.' : 'Echec de la connexion.');
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role config
  const roleConfig = {
    chercheur: {
      icon: '👤', title: isEn ? 'I\'m looking for a job' : 'Je cherche un emploi',
      subtitle: isEn ? 'Candidate' : 'Candidat', color: 'green',
      desc: isEn ? 'Access job offers, build your CV, and apply directly.' : 'Accedez aux offres, creez votre CV et postulez directement.',
      heroTitle: isEn ? 'Find your dream job in Cameroon' : 'Trouvez votre emploi ideal au Cameroun',
      heroDesc: isEn ? 'Thousands of opportunities across all sectors and regions.' : 'Des milliers d\'opportunites dans tous les secteurs et regions.',
    },
    entreprise: {
      icon: '🏢', title: isEn ? 'I\'m hiring' : 'Je recrute',
      subtitle: isEn ? 'Company' : 'Entreprise', color: 'blue',
      desc: isEn ? 'Post job offers and find the best talent in Cameroon.' : 'Publiez des offres et trouvez les meilleurs talents au Cameroun.',
      heroTitle: isEn ? 'Recruit the best talent in Cameroon' : 'Recrutez les meilleurs talents du Cameroun',
      heroDesc: isEn ? 'Post your job offers and reach thousands of qualified candidates.' : 'Publiez vos offres et touchez des milliers de candidats qualifies.',
    },
    artisan: {
      icon: '🛠️', title: isEn ? 'I offer my services' : 'Je propose mes services',
      subtitle: 'Artisan', color: 'amber',
      desc: isEn ? 'Showcase your skills and get clients near you.' : 'Montrez votre savoir-faire et trouvez des clients pres de chez vous.',
      heroTitle: isEn ? 'Grow your artisan business' : 'Developpez votre activite artisanale',
      heroDesc: isEn ? 'Get discovered by clients across Cameroon looking for your skills.' : 'Soyez decouvert par des clients dans tout le Cameroun.',
    },
  };

  const currentRole = roleConfig[selectedRole];
  const textInputClass = 'w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] focus:border-[#DA7756] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 outline-none transition-all duration-200 text-[15px] hover:border-gray-400 focus:shadow-[0_0_0_4px_rgba(218,119,86,0.15)]';
  const compactInputClass = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 outline-none transition-all duration-200 text-sm hover:border-gray-400 focus:shadow-[0_0_0_4px_rgba(218,119,86,0.15)]';

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-black">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row">
        {/* LEFT PANEL (Form) */}
        <div className="relative isolate flex w-full lg:w-1/2 lg:overflow-y-auto lg:max-h-screen px-4 py-6 sm:px-6 sm:py-8 lg:px-24 lg:py-16 xl:px-32">
          <div className="pointer-events-none absolute -top-10 -left-8 h-44 w-44 rounded-full bg-[#FFE6D8] blur-3xl" />
          <div className="pointer-events-none absolute bottom-6 right-2 h-40 w-40 rounded-full bg-[#DBECFF] blur-3xl" />
          <div className="mx-auto w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:rounded-[2rem] sm:p-8 md:p-12 lg:max-w-none lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="relative z-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <div className="mb-6 sm:mb-10 flex items-center justify-between gap-3">
            <div className="flex items-center">
              <Image src="/logo.svg" alt="Bolo237" width={144} height={40} className="h-9 sm:h-10 w-auto" priority />
            </div>
            <Link href={localizePath('/')} className="self-start text-gray-400 hover:text-gray-600 transition" aria-label={isEn ? 'Close' : 'Fermer'}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>

          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-2 sm:mb-3">{hero.title}</h1>
            <p className="text-sm sm:text-base font-medium text-gray-600 leading-relaxed">{hero.subtitle}</p>
          </div>

          {/* Toggle */}
          <div className="mb-6 inline-flex w-full self-start rounded-2xl bg-white/70 p-1.5 ring-1 ring-gray-200 sm:w-auto">
            <button
              onClick={() => { setIsLogin(true); setAuthError(''); }}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 ${isLogin ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black hover:bg-white/50'}`}
            >
              {isEn ? 'Sign in' : 'Se connecter'}
            </button>
            <button
              onClick={() => { setIsLogin(false); setAuthError(''); }}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 ${!isLogin ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black hover:bg-white/50'}`}
            >
              {isEn ? 'Sign up' : 'S\'inscrire'}
            </button>
          </div>

          {/* ━━━ LOGIN ━━━ */}
          {isLogin && (
            <div className="space-y-5 flex-1">
              <div>
                <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">{isEn ? 'Sign in' : 'Connexion'}</h2>
                <p className="text-base text-gray-600">{isEn ? 'Access your dashboard.' : 'Accedez a votre espace candidat, entreprise ou artisan.'}</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 block">{isEn ? 'Email or phone' : 'Email ou telephone'}</label>
                  <input type="text" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="username"
                    inputMode="email"
                    placeholder={isEn ? 'name@example.com or +2376...' : 'nom@example.com ou +2376...'}
                    className={textInputClass} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-gray-700">{isEn ? 'Password' : 'Mot de passe'}</label>
                    <button type="button" onClick={() => { setShowReset(true); setAuthError(''); setResetMessage(''); setResetSuccess(false); setResetCodeSent(false); setResetCode(''); setResetNewPassword(''); }} className="text-xs font-bold text-[#C4623F] hover:underline">{isEn ? 'Forgot?' : 'Oublie ?'}</button>
                  </div>
                  <div className="relative">
                    <input type={showLoginPassword ? 'text' : 'password'} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={`${textInputClass} pr-12`} />
                    <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold">
                      {showLoginPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={handleLogin} disabled={isSubmitting}
                className="w-full bg-[#DA7756] text-white font-bold py-3.5 rounded-xl hover:bg-[#C4623F] transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0 text-[15px]">
                {isSubmitting ? (isEn ? 'Signing in...' : 'Connexion...') : (isEn ? 'Sign in' : 'Se connecter')}
              </button>

              {/* Social login divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-xs text-zinc-400">{isEn ? 'or continue with' : 'ou continuer avec'}</span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>

              {/* Google Sign-In */}
              <button
                onClick={() => window.alert('Google Sign-In coming soon')}
                className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {isEn ? 'Continue with Google' : 'Continuer avec Google'}
              </button>

              {/* Apple Sign-In */}
              <button
                onClick={() => window.alert('Apple Sign-In coming soon')}
                className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-black text-sm font-medium text-white hover:bg-zinc-800 transition-all duration-200 hover:-translate-y-0.5"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                {isEn ? 'Continue with Apple' : 'Continuer avec Apple'}
              </button>

              {/* ━━━ RESET PASSWORD MODAL ━━━ */}
              {showReset && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 relative">
                    <button onClick={() => setShowReset(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold">&times;</button>
                    <h3 className="text-xl font-extrabold text-gray-900">
                      {isEn ? 'Reset your password' : 'Reinitialiser le mot de passe'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {isEn ? 'Enter the phone number linked to your account. We will send you a verification code.' : 'Entrez le numero de telephone lie a votre compte. Nous vous enverrons un code de verification.'}
                    </p>

                    {!resetSuccess ? (
                      <>
                        {/* Phone input */}
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <select value={resetCountryCode} onChange={(e) => setResetCountryCode(e.target.value as CountryPhoneOption['code'])} className="w-full max-w-[170px] border border-gray-300 rounded-xl px-2 py-3 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2">
                            {COUNTRY_PHONE_OPTIONS.map((c) => (
                              <option key={c.code} value={c.code}>{c.flag} {c.dialCode}</option>
                            ))}
                          </select>
                          <input type="tel" value={resetPhone} onChange={(e) => setResetPhone(e.target.value.replace(/[^\d\s()-]/g, ''))}
                            autoComplete="tel"
                            inputMode="tel"
                            placeholder={COUNTRY_PHONE_OPTIONS.find(c => c.code === resetCountryCode)?.placeholder || '6XX XX XX XX'}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] focus:border-[#DA7756] outline-none transition-all duration-200 text-sm hover:border-gray-400 focus:shadow-[0_0_0_4px_rgba(218,119,86,0.15)]" />
                        </div>

                        {/* Send reset code button */}
                        {!resetCodeSent && (
                          <button
                            onClick={async () => {
                              setResetMessage('');
                              const country = COUNTRY_PHONE_OPTIONS.find(c => c.code === resetCountryCode) || COUNTRY_PHONE_OPTIONS[0];
                              const fullPhone = `${country.dialCode}${resetPhone.replace(/\D/g, '')}`;
                              try {
                                await forgotPassword(fullPhone);
                                setResetCodeSent(true);
                                setResetMessage(isEn ? 'Code sent! Check your SMS.' : 'Code envoye ! Verifiez vos SMS.');
                              } catch (err: unknown) {
                                setResetMessage(err instanceof Error ? err.message : 'Error');
                              }
                            }}
                            className="w-full bg-[#DA7756] text-white font-bold py-3 rounded-xl hover:bg-[#C4623F] transition-all duration-200 hover:-translate-y-0.5 text-sm"
                          >
                            {isEn ? 'Send verification code' : 'Envoyer le code de verification'}
                          </button>
                        )}

                        {/* Code + new password */}
                        {resetCodeSent && (
                          <>
                            <div>
                              <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Verification code' : 'Code de verification'}</label>
                              <input type="text" value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="123456" className={compactInputClass} />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'New password' : 'Nouveau mot de passe'}</label>
                              <input type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)}
                                autoComplete="new-password"
                                placeholder="••••••••" className={compactInputClass} />
                            </div>
                            <button
                              onClick={async () => {
                                setResetMessage('');
                                const country = COUNTRY_PHONE_OPTIONS.find(c => c.code === resetCountryCode) || COUNTRY_PHONE_OPTIONS[0];
                                const fullPhone = `${country.dialCode}${resetPhone.replace(/\D/g, '')}`;
                                try {
                                  await resetPassword({ phone: fullPhone, code: resetCode.trim(), newPassword: resetNewPassword });
                                  setResetSuccess(true);
                                  setResetMessage(isEn ? 'Password changed! You can now sign in.' : 'Mot de passe modifie ! Vous pouvez maintenant vous connecter.');
                                } catch (err: unknown) {
                                  setResetMessage(err instanceof Error ? err.message : 'Error');
                                }
                              }}
                              className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all duration-200 hover:-translate-y-0.5 text-sm"
                            >
                              {isEn ? 'Reset password' : 'Reinitialiser le mot de passe'}
                            </button>
                          </>
                        )}

                        {resetMessage && (
                          <p className={`text-xs font-bold px-3 py-2 rounded-lg ${resetMessage.includes('envoye') || resetMessage.includes('sent') ? 'bg-green-50 text-green-700' : resetMessage.includes('modifie') || resetMessage.includes('changed') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {resetMessage}
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">✓</div>
                        <p className="text-sm font-bold text-green-700 mb-4">{resetMessage}</p>
                        <button onClick={() => setShowReset(false)} className="bg-[#DA7756] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#C4623F] transition text-sm">
                          {isEn ? 'Back to login' : 'Retour à la connexion'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ━━━ SIGNUP ━━━ */}
          {!isLogin && (
            <div className="space-y-5 flex-1">
              <div>
                <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-gray-900">{isEn ? 'Create your account' : 'Creer votre compte'}</h2>
                <p className="text-base text-gray-600">
                  {isEn ? 'One simple form, instant access to your dashboard.' : 'Un formulaire unique, acces instantane a votre dashboard.'}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-600">{isEn ? 'Account type' : 'Type de compte'}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(roleConfig) as SignupRole[]).map((role) => {
                    const cfg = roleConfig[role];
                    const active = selectedRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${active
                          ? role === 'entreprise' ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : role === 'artisan' ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-[#DA7756] bg-[#FFF5EF] text-[#8B4332]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        <span className="mr-1">{cfg.icon}</span>{cfg.subtitle}
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
                <label className="text-xs font-bold text-gray-600 mb-1 block">Email <span className="text-gray-400">({isEn ? 'optional' : 'optionnel'})</span></label>
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
                    aria-label={showPassword ? (isEn ? 'Hide password' : 'Masquer le mot de passe') : (isEn ? 'Show password' : 'Afficher le mot de passe')}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Confirm password' : 'Confirmer le mot de passe'} *</label>
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
                  selectedRole === 'entreprise' ? 'bg-blue-600 hover:bg-blue-700' :
                  selectedRole === 'artisan' ? 'bg-amber-500 hover:bg-amber-600' :
                  'bg-[#DA7756] hover:bg-[#C4623F]'
                }`}
              >
                {isSubmitting
                  ? (isEn ? 'Creating account...' : 'Creation du compte...')
                  : (isEn ? 'Sign up' : 'S\'inscrire')}
              </button>
            </div>
          )}

          {/* Error */}
          {authError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-red-500 text-sm mt-0.5">⚠️</span>
              <p className="text-sm font-bold text-red-700">{authError}</p>
            </div>
          )}

          {/* Toggle bottom */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600 font-medium">
              {isLogin ? (isEn ? 'No account yet? ' : 'Pas encore de compte ? ') : (isEn ? 'Already have an account? ' : 'Deja un compte ? ')}
              <button onClick={() => { setIsLogin(!isLogin); setAuthError(''); }} className="text-[#C4623F] font-bold hover:underline">
                {isLogin ? (isEn ? 'Sign up' : 'S\'inscrire') : (isEn ? 'Sign in' : 'Se connecter')}
              </button>
            </p>
          </div>
          </div>
          </div>
        </div>

        {/* RIGHT PANEL (Illustration) */}
        <aside className="relative hidden lg:block lg:w-1/2">
          <Image
            key={hero.image}
            src={hero.image}
            alt={hero.title}
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-black/30 to-black/60" />
          <div className="absolute inset-0 flex flex-col justify-between p-10 text-white xl:p-14">
            <Link href={localizePath('/')}>
              <Image src="/logo-white.svg" alt="Bolo237" width={160} height={42} priority className="h-10 w-auto" />
            </Link>

            <div className="max-w-xl rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md xl:p-8">
              <p className="mb-3 inline-flex rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide backdrop-blur-sm">
                {heroRole === 'artisan' ? 'Artisan' : heroRole === 'entreprise' ? 'Entreprise' : 'Candidat'}
              </p>
              <h1 className="text-4xl font-extrabold leading-tight xl:text-5xl">{hero.title}</h1>
              <p className="mt-4 max-w-xl text-base text-white/90 xl:text-lg">{hero.subtitle}</p>
            </div>

            <div className="flex items-center gap-3 text-xs font-medium text-white/70">
              <span className="h-px w-10 bg-white/30" />
              Plateforme securisee
              <span>•</span>
              Connexion rapide
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function Connexion() {
  return (
    <Suspense fallback={null}>
      <ConnexionContent />
    </Suspense>
  );
}
