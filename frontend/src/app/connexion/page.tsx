"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';
import { createUser, loginUser } from '@/lib/api';

type SignupRole = 'chercheur' | 'entreprise' | 'artisan';
type Role = SignupRole | 'admin';

const ROLE_STORAGE_KEY = 'bolo237-account-role';
const USER_KEY = 'bolo237-user';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

export default function Connexion() {
  const router = useRouter();
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  // Mode
  const [isLogin, setIsLogin] = useState(true);
  // Signup steps: 1=role, 2=identity(name+phone), 3=OTP, 4=password+role-specific
  const [step, setStep] = useState(1);

  // Signup fields
  const [selectedRole, setSelectedRole] = useState<SignupRole>('chercheur');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryPhoneOption['code']>('CM');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // OTP
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  // Entreprise
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  // Artisan
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // UI
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCountry = COUNTRY_PHONE_OPTIONS.find((country) => country.code === selectedCountryCode) || COUNTRY_PHONE_OPTIONS[0];
  const cleanedLocalPhone = phone.replace(/\D/g, '');
  const internationalPhone = `${selectedCountry.dialCode}${cleanedLocalPhone}`;

  const getDashboardRoute = (role: Role) => {
    if (role === 'admin') return localizePath('/super-admin');
    if (role === 'entreprise') return localizePath('/dashboard-entreprise');
    if (role === 'artisan') return localizePath('/dashboard-artisan');
    return localizePath('/dashboard');
  };

  // Send OTP
  const handleSendOtp = async () => {
    if (!cleanedLocalPhone || cleanedLocalPhone.length < 6 || cleanedLocalPhone.length > 14) {
      setAuthError(isEn ? 'Please enter a valid phone number.' : 'Veuillez saisir un numero de telephone valide.');
      return;
    }
    setAuthError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: internationalPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP failed');
      setOtpSent(true);
      if (data.demoCode) setDemoOtp(data.demoCode);
      setStep(3);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'OTP error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length < 4) {
      setAuthError(isEn ? 'Please enter the verification code.' : 'Veuillez saisir le code de verification.');
      return;
    }
    setAuthError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: internationalPhone, code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || (isEn ? 'Invalid code' : 'Code invalide'));
      setOtpVerified(true);
      setStep(4);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Verification error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Final signup
  const handleSignup = async () => {
    if (!password.trim() || password.length < 6) {
      setAuthError(isEn ? 'Password must be at least 6 characters.' : 'Le mot de passe doit contenir au moins 6 caracteres.');
      return;
    }
    if (selectedRole === 'entreprise' && !companyName.trim()) {
      setAuthError(isEn ? 'Please enter your company name.' : 'Veuillez saisir le nom de votre entreprise.');
      return;
    }
    if (selectedRole === 'artisan' && !specialty.trim()) {
      setAuthError(isEn ? 'Please enter your specialty.' : 'Veuillez saisir votre specialite.');
      return;
    }
    setAuthError('');
    setIsSubmitting(true);
    try {
      const fullName = selectedRole === 'entreprise'
        ? `${firstName.trim()} ${lastName.trim()} — ${companyName.trim()}`
        : selectedRole === 'artisan'
          ? `${firstName.trim()} ${lastName.trim()} — ${specialty.trim()}`
          : `${firstName.trim()} ${lastName.trim()}`;

      const user = await createUser({
        email: email.trim() || `${internationalPhone.replace(/\D/g, '')}@bolo237.local`,
        password: password,
        name: fullName,
        role: ROLE_MAP[selectedRole],
        phone: internationalPhone,
      });

      if (typeof window !== 'undefined') {
        const localRole = BACKEND_ROLE_TO_LOCAL[user.role] || 'chercheur';
        window.localStorage.setItem(USER_KEY, JSON.stringify(user));
        window.localStorage.setItem(ROLE_STORAGE_KEY, localRole);
        window.localStorage.setItem('bolo237-phone-verified', 'true');
        router.push(getDashboardRoute(localRole));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isEn ? 'Account creation failed.' : 'Echec de la creation du compte.');
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Login
  const handleLogin = async () => {
    if (!loginEmail.trim()) {
      setAuthError(isEn ? 'Please enter your email.' : 'Veuillez saisir votre email.');
      return;
    }
    if (!loginPassword.trim()) {
      setAuthError(isEn ? 'Please enter your password.' : 'Veuillez saisir votre mot de passe.');
      return;
    }
    setAuthError('');
    setIsSubmitting(true);
    try {
      const user = await loginUser({ email: loginEmail.trim(), password: loginPassword });
      if (typeof window !== 'undefined') {
        const localRole = BACKEND_ROLE_TO_LOCAL[user.role] || 'chercheur';
        window.localStorage.setItem(USER_KEY, JSON.stringify(user));
        window.localStorage.setItem(ROLE_STORAGE_KEY, localRole);
        window.localStorage.setItem('bolo237-phone-verified', 'true');
        router.push(getDashboardRoute(localRole));
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
  const borderColor = currentRole.color === 'green' ? 'border-[#DA7756]' : currentRole.color === 'blue' ? 'border-blue-500' : 'border-amber-500';
  const bgColor = currentRole.color === 'green' ? 'bg-[#FFF5EF]' : currentRole.color === 'blue' ? 'bg-blue-50' : 'bg-amber-50';

  const heroGradient = selectedRole === 'entreprise'
    ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.85), rgba(17, 24, 39, 0.75))'
    : selectedRole === 'artisan'
      ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.80), rgba(17, 24, 39, 0.75))'
      : 'linear-gradient(135deg, rgba(168, 80, 47, 0.85), rgba(17, 24, 39, 0.75))';

  const stepLabel = step === 1
    ? (isEn ? 'Step 1/4 — Choose your role' : 'Etape 1/4 — Choisissez votre role')
    : step === 2
      ? (isEn ? 'Step 2/4 — Your identity' : 'Etape 2/4 — Votre identite')
      : step === 3
        ? (isEn ? 'Step 3/4 — Phone verification' : 'Etape 3/4 — Verification telephone')
        : (isEn ? 'Step 4/4 — Finalize your account' : 'Etape 4/4 — Finalisez votre compte');

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-black flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 min-h-[720px]">

        {/* LEFT PANEL (Hero) */}
        <div
          className="hidden md:flex relative"
          style={{ backgroundImage: `${heroGradient}, url('/auth-hero.svg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 p-10 lg:p-14 flex flex-col justify-between text-white">
            <Link href={localizePath('/')}>
              <Image src="/logo-white.svg" alt="Bolo237" width={160} height={42} priority className="h-10 w-auto" />
            </Link>
            <div>
              {!isLogin && (
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-bold mb-6">
                  <span>{currentRole.icon}</span>
                  <span>{currentRole.subtitle}</span>
                </div>
              )}
              <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight mb-4">
                {isLogin ? (isEn ? 'Welcome back to Bolo237.' : 'Bon retour sur Bolo237.') : currentRole.heroTitle}
              </h1>
              <p className="text-white/80 font-medium text-lg">
                {isLogin
                  ? (isEn ? 'Sign in to access your dashboard.' : 'Connectez-vous pour acceder a votre espace.')
                  : currentRole.heroDesc}
              </p>
            </div>
            <div className="flex items-center gap-3 text-white/40 text-xs font-medium">
              <span className="w-8 h-[1px] bg-white/20"></span>
              {isEn ? 'Secured platform' : 'Plateforme securisee'} <span>•</span> {isEn ? 'Anti-fraud protection' : 'Protection anti-fraude'}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (Form) */}
        <div className="relative p-6 sm:p-8 lg:p-10 flex flex-col overflow-y-auto max-h-[90vh]">
          {/* Mobile logo + close */}
          <div className="flex items-center justify-between mb-6">
            <div className="md:hidden">
              <Image src="/logo.svg" alt="Bolo237" width={120} height={32} className="h-8 w-auto" />
            </div>
            <Link href={localizePath('/')} className="text-gray-400 hover:text-gray-600 transition ml-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>

          {/* Toggle */}
          <div className="bg-gray-100 p-1 rounded-full inline-flex mb-6 self-start">
            <button
              onClick={() => { setIsLogin(true); setAuthError(''); }}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition ${isLogin ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
            >
              {isEn ? 'Sign in' : 'Se connecter'}
            </button>
            <button
              onClick={() => { setIsLogin(false); setStep(1); setAuthError(''); }}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition ${!isLogin ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
            >
              {isEn ? 'Sign up' : 'S\'inscrire'}
            </button>
          </div>

          {/* ━━━ LOGIN ━━━ */}
          {isLogin && (
            <div className="space-y-5 flex-1">
              <div>
                <h2 className="text-2xl font-extrabold mb-1">{isEn ? 'Sign in' : 'Connexion'}</h2>
                <p className="text-sm text-gray-500">{isEn ? 'Access your dashboard.' : 'Accedez a votre espace candidat, entreprise ou artisan.'}</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 block">{isEn ? 'Email' : 'Adresse email'}</label>
                  <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nom@example.com"
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] focus:border-[#DA7756] outline-none transition text-[15px]" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-gray-700">{isEn ? 'Password' : 'Mot de passe'}</label>
                    <Link href="#" className="text-xs font-bold text-[#C4623F] hover:underline">{isEn ? 'Forgot?' : 'Oublie ?'}</Link>
                  </div>
                  <div className="relative">
                    <input type={showLoginPassword ? 'text' : 'password'} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] focus:border-[#DA7756] outline-none transition text-[15px] pr-12" />
                    <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold">
                      {showLoginPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={handleLogin} disabled={isSubmitting}
                className="w-full bg-[#DA7756] text-white font-bold py-3.5 rounded-xl hover:bg-[#C4623F] transition shadow-md disabled:opacity-60 text-[15px]">
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
                className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
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
                className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-black text-sm font-medium text-white hover:bg-zinc-800 transition"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                {isEn ? 'Continue with Apple' : 'Continuer avec Apple'}
              </button>
            </div>
          )}

          {/* ━━━ SIGNUP ━━━ */}
          {!isLogin && (
            <div className="space-y-5 flex-1">

              {/* Progress bar */}
              <div className="flex items-center gap-1 mb-1">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-[#DA7756]' : 'bg-gray-200'}`} />
                ))}
              </div>
              <p className="text-xs text-gray-400 font-bold">{stepLabel}</p>

              {/* STEP 1: Role */}
              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-2xl font-extrabold mb-1">{isEn ? 'Who are you?' : 'Qui etes-vous ?'}</h2>
                    <p className="text-sm text-gray-500">{isEn ? 'Choose your account type.' : 'Choisissez votre type de compte.'}</p>
                  </div>

                  {/* Quick signup with Google/Apple */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400">{isEn ? 'Quick signup' : 'Inscription rapide'}</p>
                    <button
                      onClick={() => window.alert('Google Sign-Up coming soon')}
                      className="flex items-center justify-center gap-3 w-full h-12 rounded-xl border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      {isEn ? 'Continue with Google' : 'Continuer avec Google'}
                    </button>
                    <button
                      onClick={() => window.alert('Apple Sign-Up coming soon')}
                      className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-black text-sm font-medium text-white hover:bg-zinc-800 transition"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      {isEn ? 'Continue with Apple' : 'Continuer avec Apple'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-zinc-200" />
                    <span className="text-xs text-zinc-400">{isEn ? 'or choose a role' : 'ou choisissez un role'}</span>
                    <div className="flex-1 h-px bg-zinc-200" />
                  </div>

                  <div className="space-y-3">
                    {(Object.keys(roleConfig) as SignupRole[]).map((role) => {
                      const cfg = roleConfig[role];
                      const isActive = selectedRole === role;
                      const activeBorder = cfg.color === 'green' ? 'border-[#DA7756] bg-[#FFF5EF]' : cfg.color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-amber-500 bg-amber-50';
                      const activeRing = cfg.color === 'green' ? 'ring-[#E8C4B0]' : cfg.color === 'blue' ? 'ring-blue-200' : 'ring-amber-200';
                      return (
                        <button key={role} onClick={() => setSelectedRole(role)}
                          className={`w-full border-2 rounded-2xl p-5 text-left transition-all duration-200 flex items-start gap-4 ${isActive ? `${activeBorder} ring-2 ${activeRing}` : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                          <span className="text-3xl mt-0.5">{cfg.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[15px] text-black">{cfg.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{cfg.desc}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition ${isActive ? (cfg.color === 'green' ? 'border-[#DA7756] bg-[#DA7756]' : cfg.color === 'blue' ? 'border-blue-500 bg-blue-500' : 'border-amber-500 bg-amber-500') : 'border-gray-300'}`}>
                            {isActive && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => { setStep(2); setAuthError(''); }}
                    className="w-full bg-[#DA7756] text-white font-bold py-3.5 rounded-xl hover:bg-[#C4623F] transition shadow-md text-[15px]">
                    {isEn ? 'Continue' : 'Continuer'} →
                  </button>
                </>
              )}

              {/* STEP 2: Identity (Nom, Prenom, Username, Phone) */}
              {step === 2 && (
                <>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStep(1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                      <h2 className="text-xl font-extrabold">{isEn ? 'Your identity' : 'Votre identite'}</h2>
                      <p className="text-xs text-gray-500">{isEn ? 'Quick — 30 seconds' : 'Rapide — 30 secondes'}</p>
                    </div>
                  </div>

                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${bgColor} ${borderColor} border`}>
                    <span>{currentRole.icon}</span> {currentRole.subtitle}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Last name' : 'Nom'} *</label>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                          placeholder={isEn ? 'Last name' : 'Nom'}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] outline-none text-[15px]" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'First name' : 'Prenom'} *</label>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                          placeholder={isEn ? 'First name' : 'Prenom'}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] outline-none text-[15px]" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Username' : 'Nom d\'utilisateur'} *</label>
                      <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                        placeholder={isEn ? 'e.g. marie.ngono' : 'ex. marie.ngono'}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] outline-none text-[15px]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Phone number' : 'Numero de telephone'} * 🔒</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedCountryCode}
                          onChange={(e) => setSelectedCountryCode(e.target.value as CountryPhoneOption['code'])}
                          className="w-[170px] px-3 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#DA7756] outline-none"
                        >
                          {COUNTRY_PHONE_OPTIONS.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.flag} {country.dialCode}
                            </option>
                          ))}
                        </select>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s()-]/g, ''))}
                          placeholder={selectedCountry.placeholder}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] outline-none text-[15px]" />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {isEn ? 'We will send a verification code via SMS to' : 'Nous enverrons un code de verification par SMS au'} {internationalPhone}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Email <span className="text-gray-400">({isEn ? 'optional' : 'optionnel'})</span></label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="nom@email.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] outline-none text-[15px]" />
                    </div>
                  </div>

                  <button onClick={() => {
                    if (!lastName.trim() || !firstName.trim()) { setAuthError(isEn ? 'Name and first name are required.' : 'Le nom et le prenom sont obligatoires.'); return; }
                    if (!username.trim()) { setAuthError(isEn ? 'Please choose a username.' : 'Veuillez choisir un nom d\'utilisateur.'); return; }
                    if (!cleanedLocalPhone || cleanedLocalPhone.length < 6 || cleanedLocalPhone.length > 14) { setAuthError(isEn ? 'Valid phone number required.' : 'Numero de telephone valide requis.'); return; }
                    setAuthError('');
                    handleSendOtp();
                  }} disabled={isSubmitting}
                    className="w-full bg-[#DA7756] text-white font-bold py-3.5 rounded-xl hover:bg-[#C4623F] transition shadow-md text-[15px] disabled:opacity-60">
                    {isSubmitting ? (isEn ? 'Sending code...' : 'Envoi du code...') : (isEn ? 'Send verification code' : 'Envoyer le code de verification')} 📲
                  </button>
                </>
              )}

              {/* STEP 3: OTP Verification */}
              {step === 3 && (
                <>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStep(2)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                      <h2 className="text-xl font-extrabold">{isEn ? 'Verify your number' : 'Verifiez votre numero'}</h2>
                      <p className="text-xs text-gray-500">{isEn ? 'Enter the code sent to' : 'Entrez le code envoye au'} {internationalPhone}</p>
                    </div>
                  </div>

                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-[#FEEBD6] rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📱</div>
                    <input
                      type="text" value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      className="text-center text-2xl font-extrabold tracking-[0.5em] w-56 mx-auto px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] focus:border-[#DA7756] outline-none"
                      maxLength={6}
                      autoFocus
                    />
                    {demoOtp && (
                      <p className="mt-3 text-xs bg-amber-50 border border-amber-200 text-amber-700 font-bold px-4 py-2 rounded-lg inline-block">
                        🧪 Code demo : <span className="font-mono">{demoOtp}</span>
                      </p>
                    )}
                  </div>

                  <button onClick={handleVerifyOtp} disabled={isSubmitting}
                    className="w-full bg-[#DA7756] text-white font-bold py-3.5 rounded-xl hover:bg-[#C4623F] transition shadow-md text-[15px] disabled:opacity-60">
                    {isSubmitting ? (isEn ? 'Verifying...' : 'Verification...') : (isEn ? 'Verify code' : 'Verifier le code')} ✓
                  </button>

                  <button onClick={handleSendOtp} disabled={isSubmitting} className="text-sm font-bold text-[#C4623F] hover:underline text-center">
                    {isEn ? 'Resend code' : 'Renvoyer le code'}
                  </button>
                </>
              )}

              {/* STEP 4: Password + Role-specific fields */}
              {step === 4 && (
                <>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStep(3)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                      <h2 className="text-xl font-extrabold">{isEn ? 'Finalize your account' : 'Finalisez votre compte'}</h2>
                      <p className="text-xs text-gray-500">{isEn ? 'Almost there!' : 'C\'est presque fini !'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 bg-[#DA7756] rounded-full flex items-center justify-center text-white text-xs">✓</span>
                    <span className="font-bold text-[#C4623F]">{isEn ? 'Phone verified' : 'Telephone verifie'}: {internationalPhone}</span>
                  </div>

                  <div className="space-y-3">
                    {/* Entreprise fields */}
                    {selectedRole === 'entreprise' && (
                      <>
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Company name' : 'Nom de l\'entreprise'} *</label>
                          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                            placeholder={isEn ? 'e.g. MTN Cameroon' : 'ex. MTN Cameroun'}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[15px]" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Sector' : 'Secteur d\'activite'}</label>
                          <select value={sector} onChange={(e) => setSector(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[15px] bg-white">
                            <option value="">{isEn ? 'Select a sector' : 'Selectionnez un secteur'}</option>
                            <option value="tech">Tech / IT</option>
                            <option value="finance">{isEn ? 'Finance / Banking' : 'Finance / Banque'}</option>
                            <option value="commerce">Commerce / Distribution</option>
                            <option value="construction">BTP / Construction</option>
                            <option value="sante">{isEn ? 'Health' : 'Sante'}</option>
                            <option value="education">{isEn ? 'Education' : 'Education'}</option>
                            <option value="transport">Transport / Logistique</option>
                            <option value="autre">{isEn ? 'Other' : 'Autre'}</option>
                          </select>
                        </div>
                      </>
                    )}

                    {/* Artisan fields */}
                    {selectedRole === 'artisan' && (
                      <>
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Specialty' : 'Specialite'} *</label>
                          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-[15px] bg-white">
                            <option value="">{isEn ? 'Choose your trade' : 'Choisissez votre metier'}</option>
                            <option value="plomberie">{isEn ? 'Plumbing' : 'Plomberie'}</option>
                            <option value="electricite">{isEn ? 'Electrical' : 'Electricite'}</option>
                            <option value="menuiserie">{isEn ? 'Carpentry' : 'Menuiserie'}</option>
                            <option value="maconnerie">{isEn ? 'Masonry' : 'Maconnerie'}</option>
                            <option value="peinture">{isEn ? 'Painting' : 'Peinture'}</option>
                            <option value="couture">{isEn ? 'Tailoring' : 'Couture'}</option>
                            <option value="coiffure">{isEn ? 'Hairdressing' : 'Coiffure'}</option>
                            <option value="mecanique">{isEn ? 'Mechanic' : 'Mecanique'}</option>
                            <option value="autre">{isEn ? 'Other' : 'Autre'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'City / Area' : 'Ville / Quartier'}</label>
                          <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                            placeholder={isEn ? 'e.g. Douala, Akwa' : 'ex. Douala, Akwa'}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-[15px]" />
                        </div>
                      </>
                    )}

                    {/* Password */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Choose a password' : 'Choisissez un mot de passe'} *</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                          placeholder={isEn ? '6 characters minimum' : '6 caracteres minimum'}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#DA7756] outline-none text-[15px] pr-12" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                          {showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button onClick={handleSignup} disabled={isSubmitting}
                    className="w-full bg-[#DA7756] text-white font-bold py-3.5 rounded-xl hover:bg-[#C4623F] transition shadow-md text-[15px] disabled:opacity-60">
                    {isSubmitting
                      ? (isEn ? 'Creating account...' : 'Creation du compte...')
                      : (isEn ? `Create my ${roleConfig[selectedRole].subtitle.toLowerCase()} account` : `Creer mon compte ${roleConfig[selectedRole].subtitle.toLowerCase()}`)}
                  </button>
                </>
              )}
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
            <p className="text-sm text-gray-500 font-medium">
              {isLogin ? (isEn ? 'No account yet? ' : 'Pas encore de compte ? ') : (isEn ? 'Already have an account? ' : 'Deja un compte ? ')}
              <button onClick={() => { setIsLogin(!isLogin); setStep(1); setAuthError(''); }} className="text-[#C4623F] font-bold hover:underline">
                {isLogin ? (isEn ? 'Sign up' : 'S\'inscrire') : (isEn ? 'Sign in' : 'Se connecter')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
