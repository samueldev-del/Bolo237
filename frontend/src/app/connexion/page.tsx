"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';
import { sendOtp as apiSendOtp, verifyOtp as apiVerifyOtp } from '@/lib/api';

type Role = 'chercheur' | 'entreprise' | 'artisan';

const ROLE_STORAGE_KEY = '237jobs-account-role';
const PHONE_VERIFIED_KEY = '237jobs-phone-verified';

export default function Connexion() {
  const router = useRouter();
  const { locale, localizePath } = useLocale();
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role>('chercheur');
  const [accountRole, setAccountRole] = useState<Role>('chercheur');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [authError, setAuthError] = useState('');

  const isEn = locale === 'en';

  const getDashboardRoute = (role: Role) => {
    if (role === 'entreprise') return localizePath('/dashboard-entreprise');
    if (role === 'artisan') return localizePath('/dashboard-artisan');
    return localizePath('/dashboard');
  };

  const saveRole = (role: Role) => {
    setAccountRole(role);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ROLE_STORAGE_KEY, role);
    }
  };

  const readStoredRole = (): Role => {
    if (typeof window === 'undefined') {
      return accountRole;
    }
    const value = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (value === 'chercheur' || value === 'entreprise' || value === 'artisan') {
      return value;
    }
    return accountRole;
  };

  const handleSignup = () => {
    if (!otpVerified) {
      setAuthError(isEn ? 'Phone verification is required before creating your account.' : 'La verification du numero est obligatoire avant de creer un compte.');
      return;
    }
    saveRole(selectedRole);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PHONE_VERIFIED_KEY, 'true');
    }
    router.push(getDashboardRoute(selectedRole));
  };

  const handleLogin = () => {
    if (typeof window !== 'undefined' && window.localStorage.getItem(PHONE_VERIFIED_KEY) !== 'true') {
      setAuthError(isEn ? 'Your account is not phone-verified yet. Please complete OTP verification first.' : 'Votre compte n est pas encore verifie par numero de telephone. Completez la verification OTP d abord.');
      return;
    }
    const role = readStoredRole();
    setAccountRole(role);
    router.push(getDashboardRoute(role));
  };

  const sendOtp = async () => {
    if (!phone.trim()) {
      setAuthError(isEn ? 'Enter a valid phone number first.' : 'Saisissez d abord un numero de telephone valide.');
      return;
    }
    setAuthError('');
    try {
      const res = await apiSendOtp(phone);
      // En dev, le backend renvoie le code pour faciliter les tests
      if (res.demoCode) {
        setOtpCode(res.demoCode);
      } else {
        setOtpCode('');
      }
      setOtpSent(true);
      setOtpVerified(false);
    } catch {
      // Fallback local si le backend est injoignable
      const fallbackCode = String(Math.floor(100000 + Math.random() * 900000));
      setOtpCode(fallbackCode);
      setOtpSent(true);
      setOtpVerified(false);
    }
  };

  const verifyOtp = async () => {
    setAuthError('');
    try {
      const res = await apiVerifyOtp(phone, otpInput.trim());
      if (res.verified) {
        setOtpVerified(true);
      } else {
        setOtpVerified(false);
        setAuthError(res.error || (isEn ? 'Invalid OTP code.' : 'Code OTP invalide.'));
      }
    } catch {
      // Fallback local : comparer au code affiché
      if (otpInput.trim() === otpCode) {
        setOtpVerified(true);
      } else {
        setOtpVerified(false);
        setAuthError(isEn ? 'Invalid OTP code.' : 'Code OTP invalide.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] font-sans text-black flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-2 min-h-[700px]">
        <div
          className="hidden md:flex relative"
          style={{
            backgroundImage: "linear-gradient(120deg, rgba(2, 44, 34, 0.72), rgba(17, 24, 39, 0.68)), url('/auth-hero.svg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 p-10 lg:p-14 flex flex-col justify-between text-white">
            <Link href={localizePath('/')}>
              <Image src="/logo-white.svg" alt="237jobs" width={160} height={42} priority className="h-10 w-auto" />
            </Link>

            <div>
              <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-4">
                {isEn
                  ? 'Join the leading network of talents and artisans in Cameroon.'
                  : 'Rejoignez le premier reseau des talents et artisans au Cameroun.'}
              </h1>
              <p className="text-white/90 font-medium text-lg">
                {isEn
                  ? 'Find a job, recruit faster, or grow your artisan business from one platform.'
                  : 'Trouvez un emploi, recrutez vite, ou developpez votre activite artisanale depuis une seule plateforme.'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative p-6 sm:p-8 lg:p-12 flex flex-col">
          <div className="flex items-start justify-between mb-8">
            <div className="md:hidden">
              <Image src="/logo.svg" alt="237jobs" width={120} height={32} className="h-8 w-auto" />
            </div>

            <div className="ml-auto bg-gray-100 p-1 rounded-full inline-flex">
              <button
                onClick={() => setIsLogin(true)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition ${
                  isLogin ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                }`}
              >
                {isEn ? 'Sign in' : 'Se connecter'}
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition ${
                  !isLogin ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                }`}
              >
                {isEn ? 'Sign up' : 'S inscrire'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {!isLogin && (
              <>
                <div>
                  <h2 className="text-2xl font-extrabold mb-1">{isEn ? 'Choose your account type' : 'Choisissez votre type de compte'}</h2>
                  <p className="text-sm text-gray-500">{isEn ? 'Step 1: select your role before continuing.' : 'Etape 1: selectionnez votre role avant de continuer.'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedRole('chercheur')}
                    className={`border rounded-2xl p-4 text-left transition ${
                      selectedRole === 'chercheur' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-400'
                    }`}
                  >
                    <p className="text-2xl mb-2">👤</p>
                    <p className="font-extrabold text-sm">{isEn ? 'I am looking for a job' : 'Je cherche un emploi'}</p>
                    <p className="text-xs text-gray-500 mt-1">{isEn ? 'Candidate' : 'Candidat'}</p>
                  </button>

                  <button
                    onClick={() => setSelectedRole('entreprise')}
                    className={`border rounded-2xl p-4 text-left transition ${
                      selectedRole === 'entreprise' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-400'
                    }`}
                  >
                    <p className="text-2xl mb-2">🏢</p>
                    <p className="font-extrabold text-sm">{isEn ? 'I am hiring' : 'Je recrute'}</p>
                    <p className="text-xs text-gray-500 mt-1">{isEn ? 'Company' : 'Entreprise'}</p>
                  </button>

                  <button
                    onClick={() => setSelectedRole('artisan')}
                    className={`border rounded-2xl p-4 text-left transition ${
                      selectedRole === 'artisan' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-green-400'
                    }`}
                  >
                    <p className="text-2xl mb-2">🛠️</p>
                    <p className="font-extrabold text-sm">{isEn ? 'I offer services' : 'Je propose mes services'}</p>
                    <p className="text-xs text-gray-500 mt-1">Artisan</p>
                  </button>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-3">{isEn ? 'Step 2: create your account quickly.' : 'Etape 2: creez votre compte rapidement.'}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder={isEn ? 'First name' : 'Prenom'}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 outline-none"
                    />
                    <input
                      type="text"
                      placeholder={isEn ? 'Last name' : 'Nom'}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 outline-none"
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 outline-none mb-3"
                  />
                  <input
                    type="password"
                    placeholder={isEn ? 'Password' : 'Mot de passe'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 outline-none"
                  />
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-800 mb-2">
                      {isEn ? 'Mandatory identity step: phone verification by OTP (SMS/WhatsApp).' : 'Etape identite obligatoire: verification du numero par OTP (SMS/WhatsApp).'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-2">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={isEn ? '+237 6XX XX XX XX' : '+237 6XX XX XX XX'}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 outline-none"
                      />
                      <button
                        onClick={sendOtp}
                        className="px-4 py-2.5 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800 transition"
                      >
                        {isEn ? 'Send OTP' : 'Envoyer OTP'}
                      </button>
                    </div>

                    {otpSent && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-gray-600">
                          {isEn ? 'Demo code (to connect real SMS/WhatsApp provider later):' : 'Code demo (a brancher plus tard sur un vrai provider SMS/WhatsApp):'} {otpCode}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                          <input
                            type="text"
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            placeholder="123456"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 outline-none"
                          />
                          <button
                            onClick={verifyOtp}
                            className="px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition"
                          >
                            {isEn ? 'Verify OTP' : 'Verifier OTP'}
                          </button>
                        </div>
                      </div>
                    )}

                    {otpVerified && (
                      <p className="text-xs font-bold text-green-700 mt-2">{isEn ? 'Phone successfully verified.' : 'Numero verifie avec succes.'}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSignup}
                  className="w-full border border-gray-300 rounded-xl py-3 font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <span className="text-blue-600 font-extrabold">G</span>
                  {isEn ? 'Sign up with Google' : 'S inscrire avec Google'}
                </button>

                <button
                  onClick={handleSignup}
                  className="w-full text-center bg-green-600 text-white font-extrabold py-3.5 rounded-xl hover:bg-green-700 transition shadow-sm block"
                >
                  {isEn ? 'Create my account' : 'Creer mon compte'}
                </button>
              </>
            )}

            {isLogin && (
              <>
                <div>
                  <h2 className="text-2xl font-extrabold mb-1">{isEn ? 'Sign in to your account' : 'Connexion a votre compte'}</h2>
                  <p className="text-sm text-gray-500">{isEn ? 'Access your candidate, company, or artisan dashboard.' : 'Accedez a votre espace candidat, entreprise ou artisan.'}</p>
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 outline-none mb-3"
                  />

                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-bold text-black">{isEn ? 'Password' : 'Mot de passe'}</label>
                    <Link href="#" className="text-sm font-bold text-green-700 hover:underline">
                      {isEn ? 'Forgot password?' : 'Mot de passe oublie ?'}
                    </Link>
                  </div>

                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-600 outline-none"
                  />
                </div>

                <button
                  onClick={handleLogin}
                  className="w-full border border-gray-300 rounded-xl py-3 font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <span className="text-blue-600 font-extrabold">G</span>
                  {isEn ? 'Sign in with Google' : 'Se connecter avec Google'}
                </button>

                <button
                  onClick={handleLogin}
                  className="w-full text-center bg-green-600 text-white font-extrabold py-3.5 rounded-xl hover:bg-green-700 transition shadow-sm block"
                >
                  {isEn ? 'Sign in' : 'Se connecter'}
                </button>

                <p className="text-xs text-gray-500 font-medium">
                  {isEn
                    ? 'Automatic redirect to your dashboard based on your registered role.'
                    : 'Redirection automatique vers votre dashboard selon le role enregistre a l inscription.'}
                </p>
              </>
            )}
            {authError && <p className="text-sm font-bold text-red-600">{authError}</p>}
          </div>

          <Link href={localizePath('/')} className="absolute top-4 right-4 md:top-6 md:right-6 text-gray-400 hover:text-gray-600 font-bold text-sm">
            {isEn ? 'Close' : 'Fermer'}
          </Link>
        </div>
      </div>
    </div>
  );
}
