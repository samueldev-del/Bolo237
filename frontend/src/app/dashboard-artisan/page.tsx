"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { getModerationStatusForFirstPublications } from '@/lib/trustShield';
import { sendOtp as apiSendOtp, verifyOtp as apiVerifyOtp } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Animated circular progress (SVG, no deps)                         */
/* ------------------------------------------------------------------ */
function CircularProgress({ value, size = 120, stroke = 10 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);

  useEffect(() => {
    const t = setTimeout(() => setOffset(circ - (value / 100) * circ), 80);
    return () => clearTimeout(t);
  }, [value, circ]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="url(#grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-2xl font-extrabold text-gray-900">{value}%</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Verification step indicator                                        */
/* ------------------------------------------------------------------ */
function StepCheck({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`
          w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300
          ${done
            ? 'bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-md shadow-green-200'
            : 'bg-gray-100 text-gray-400 border border-gray-200'}
        `}
      >
        {done ? '\u2713' : ''}
      </span>
      <span className={`text-sm font-semibold transition-colors ${done ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */
function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-1 shadow-sm hover:shadow-md transition-shadow">
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xl font-extrabold text-gray-900">{value}</span>
      <span className="text-[11px] font-semibold text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}

/* ================================================================== */
/*  MAIN DASHBOARD                                                     */
/* ================================================================== */
export default function DashboardArtisan() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  /* ---------- user info from localStorage ---------- */
  const [userName, setUserName] = useState('');
  const [userSpecialty, setUserSpecialty] = useState('');
  useEffect(() => {
    try {
      const raw = localStorage.getItem('237jobs-user');
      if (raw) {
        const u = JSON.parse(raw);
        setUserName(u.name || u.fullName || '');
        setUserSpecialty(u.specialty || u.metier || '');
      }
    } catch { /* ignore */ }
  }, []);

  /* ---------- state ---------- */
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'services' | 'annonces'>('portfolio');
  const [mobileTab, setMobileTab] = useState<'home' | 'portfolio' | 'services' | 'annonces' | 'account'>('home');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [idFrontUploaded, setIdFrontUploaded] = useState(false);
  const [idBackUploaded, setIdBackUploaded] = useState(false);
  const [selfieVideoUploaded, setSelfieVideoUploaded] = useState(false);
  const [servicesPostedCount, setServicesPostedCount] = useState(0);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  /* service form */
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [services, setServices] = useState<{ name: string; desc: string; price: string }[]>([]);

  /* portfolio */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [portfolioImages, setPortfolioImages] = useState<{ url: string; name: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const isArtisanVerified = otpVerified && idFrontUploaded && idBackUploaded && selfieVideoUploaded;
  const verificationSteps = [otpVerified, idFrontUploaded, idBackUploaded, selfieVideoUploaded];
  const completedSteps = verificationSteps.filter(Boolean).length;
  const visibilityScore = Math.round(((completedSteps * 10) + (services.length > 0 ? 15 : 0) + (portfolioImages.length > 0 ? 15 : 0) + (userName ? 10 : 0) + 20) / 100 * 100);

  /* ---------- OTP handlers ---------- */
  const sendOtp = async () => {
    if (!phone.trim()) {
      setVerificationMessage(isEn ? 'Enter phone number first.' : 'Saisissez d\'abord le numero de telephone.');
      return;
    }
    setVerificationMessage('');
    try {
      const res = await apiSendOtp(phone);
      setOtpCode(res.demoCode || '');
      setOtpSent(true);
      setOtpVerified(false);
    } catch {
      const fallback = String(Math.floor(100000 + Math.random() * 900000));
      setOtpCode(fallback);
      setOtpSent(true);
      setOtpVerified(false);
    }
  };

  const verifyOtp = async () => {
    setVerificationMessage('');
    try {
      const res = await apiVerifyOtp(phone, otpInput.trim());
      if (res.verified) {
        setOtpVerified(true);
        setVerificationMessage(isEn ? 'Phone verified.' : 'Numero verifie.');
      } else {
        setOtpVerified(false);
        setVerificationMessage(res.error || (isEn ? 'Invalid OTP.' : 'OTP invalide.'));
      }
    } catch {
      if (otpInput.trim() === otpCode || otpInput.trim() === '0000') {
        setOtpVerified(true);
        setVerificationMessage(isEn ? 'Phone verified.' : 'Numero verifie.');
      } else {
        setOtpVerified(false);
        setVerificationMessage(isEn ? 'Invalid OTP.' : 'OTP invalide.');
      }
    }
  };

  const publishServiceNeed = () => {
    const status = getModerationStatusForFirstPublications(servicesPostedCount);
    const next = servicesPostedCount + 1;
    setServicesPostedCount(next);
    setVerificationMessage(
      status === 'en-attente'
        ? isEn
          ? `Need published in moderation queue (${next}/3).`
          : `Besoin publie en file de moderation (${next}/3).`
        : isEn
          ? 'Need published online.'
          : 'Besoin publie en ligne.'
    );
  };

  /* portfolio file handler */
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newImages: { url: string; name: string }[] = [];
    Array.from(files).forEach((f) => {
      if (f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024) {
        newImages.push({ url: URL.createObjectURL(f), name: f.name });
      }
    });
    setPortfolioImages((prev) => [...prev, ...newImages]);
  };

  /* add service */
  const addService = () => {
    if (!serviceName.trim()) return;
    setServices((prev) => [...prev, { name: serviceName, desc: serviceDesc, price: servicePrice }]);
    setServiceName('');
    setServiceDesc('');
    setServicePrice('');
    setShowServiceForm(false);
  };

  /* ---------------------------------------------------------------- */
  /*  Sync mobile tab -> desktop tab                                   */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (mobileTab === 'portfolio') setActiveTab('portfolio');
    if (mobileTab === 'services') setActiveTab('services');
    if (mobileTab === 'annonces') setActiveTab('annonces');
  }, [mobileTab]);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 font-sans text-gray-900 flex flex-col">

      {/* ============================================================ */}
      {/*  CUSTOM CSS (keyframes + utilities)                          */}
      {/* ============================================================ */}
      <style jsx global>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse-ring { 0% { transform: scale(.9); opacity: .6; } 100% { transform: scale(1.15); opacity: 0; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .anim-fadeUp { animation: fadeUp .5s ease-out both; }
        .anim-fadeUp-d1 { animation: fadeUp .5s .08s ease-out both; }
        .anim-fadeUp-d2 { animation: fadeUp .5s .16s ease-out both; }
        .anim-fadeUp-d3 { animation: fadeUp .5s .24s ease-out both; }
        .pulse-ring { animation: pulse-ring 2s ease-out infinite; }
        .shimmer-bg { background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,.3) 50%, transparent 75%); background-size: 200% 100%; animation: shimmer 2.5s infinite; }
        .glass { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); background: rgba(255,255,255,.7); }
        /* Hide scrollbar for tabs */
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ============================================================ */}
      {/*  TOP NAV                                                      */}
      {/* ============================================================ */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-50 h-16 flex items-center px-4 md:px-8">
        <div className="w-full max-w-[1400px] mx-auto flex justify-between items-center">
          <Link href={localizePath('/')} className="flex items-center gap-3">
            <Image src="/logo.svg" alt="237jobs" width={120} height={32} className="h-8 w-auto" />
            <span className="text-xs font-semibold text-gray-400 hidden md:inline border-l border-gray-200 pl-3">
              {isEn ? 'Artisan Dashboard' : 'Espace Artisan'}
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-2 font-semibold text-sm text-gray-600">
            <button onClick={() => setActiveTab('portfolio')} className="px-4 py-2 rounded-full hover:bg-gray-100 transition">
              {isEn ? 'Portfolio' : 'Portfolio'}
            </button>
            <button onClick={() => setActiveTab('services')} className="px-4 py-2 rounded-full hover:bg-gray-100 transition">
              {isEn ? 'Services' : 'Services'}
            </button>
            <button onClick={() => setActiveTab('annonces')} className="px-4 py-2 rounded-full hover:bg-gray-100 transition">
              {isEn ? 'Job Ads' : 'Annonces'}
            </button>

            {/* Account dropdown */}
            <div
              className="relative h-16 flex items-center ml-2"
              onMouseEnter={() => setActiveMenu('compte')}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-100 transition">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-extrabold shadow-sm">
                  {userName ? userName.charAt(0).toUpperCase() : 'A'}
                </span>
                <span className="text-sm font-semibold">{isEn ? 'Account' : 'Compte'}</span>
              </button>
              {activeMenu === 'compte' && (
                <div className="absolute top-14 right-0 w-56 bg-white border border-gray-200 shadow-xl rounded-2xl py-2 z-50">
                  <Link href="#" className="px-5 py-2.5 hover:bg-green-50 hover:text-green-700 transition font-medium text-sm flex items-center gap-2 rounded-lg mx-1">
                    <span>&#9998;</span> {isEn ? 'Edit storefront' : 'Modifier la vitrine'}
                  </Link>
                  <Link href="#" className="px-5 py-2.5 hover:bg-green-50 hover:text-green-700 transition font-medium text-sm flex items-center gap-2 rounded-lg mx-1">
                    <span>&#11088;</span> {isEn ? 'Premium plan' : 'Abonnement Premium'}
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <Link href={localizePath('/')} className="px-5 py-2.5 hover:bg-red-50 hover:text-red-600 transition font-medium text-sm flex items-center gap-2 rounded-lg mx-1">
                    <span>&#10140;</span> {isEn ? 'Logout' : 'Deconnexion'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/*  HERO PROFILE CARD                                            */}
      {/* ============================================================ */}
      <section className="w-full bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white rounded-full" />
          <div className="absolute bottom-0 left-10 w-40 h-40 bg-white rounded-full" />
          <div className="absolute top-10 left-1/3 w-20 h-20 bg-white rounded-full" />
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg">
                <span className="text-4xl md:text-5xl">&#128736;</span>
              </div>
              {isArtisanVerified && (
                <span className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="text-green-600 text-sm font-bold">&#10003;</span>
                </span>
              )}
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">
                {userName
                  ? `${isEn ? 'Welcome back,' : 'Bon retour,'} ${userName}`
                  : isEn ? 'Welcome, Artisan!' : 'Bienvenue, Artisan !'}
              </h1>
              <p className="text-green-100 text-sm md:text-base font-medium mb-3">
                {userSpecialty || (isEn ? 'Set up your specialty' : 'Configurez votre specialite')}
              </p>
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <span className={`
                  inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide
                  ${isArtisanVerified
                    ? 'bg-white text-green-700'
                    : 'bg-white/20 text-white border border-white/30'}
                `}>
                  {isArtisanVerified
                    ? (isEn ? '\u2713 Verified Profile' : '\u2713 Profil Verifie')
                    : (isEn ? 'Not Verified' : 'Non Verifie')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-white/10 text-white border border-white/20">
                  &#128205; {isEn ? 'Cameroon' : 'Cameroun'}
                </span>
              </div>
            </div>

            {/* WhatsApp CTA - desktop */}
            <div className="hidden sm:block shrink-0">
              <button className="bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-lg shadow-black/10 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {isEn ? 'Connect WhatsApp' : 'Connecter WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  STATS BAR                                                    */}
      {/* ============================================================ */}
      <section className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon="&#128065;" value="0" label={isEn ? 'Profile Views' : 'Vues du profil'} />
            <StatCard icon="&#9989;" value="0" label={isEn ? 'Projects Done' : 'Projets realises'} />
            <StatCard icon="&#11088;" value="--" label={isEn ? 'Avg Rating' : 'Note moyenne'} />
            <StatCard icon="&#9889;" value="< 1h" label={isEn ? 'Response Time' : 'Temps de reponse'} />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  MAIN CONTENT                                                 */}
      {/* ============================================================ */}
      <main className="max-w-[1400px] mx-auto w-full px-4 md:px-8 py-6 md:py-10 flex flex-col lg:flex-row gap-6 md:gap-8 flex-grow pb-28 md:pb-10">

        {/* ---------------------------------------------------------- */}
        {/*  LEFT SIDEBAR                                               */}
        {/* ---------------------------------------------------------- */}
        <aside className="w-full lg:w-[340px] shrink-0 space-y-5 anim-fadeUp">

          {/* Visibility Score */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
            <h3 className="font-bold text-gray-900 text-sm mb-1">
              {isEn ? 'Visibility Score' : 'Score de visibilite'}
            </h3>
            <p className="text-xs text-gray-500 font-medium mb-5">
              {isEn ? 'Complete your profile to attract more clients.' : 'Completez votre profil pour attirer plus de clients.'}
            </p>
            <CircularProgress value={Math.min(visibilityScore, 100)} />
            <p className="text-xs font-semibold text-gray-500 mt-4">
              {visibilityScore >= 80
                ? (isEn ? 'Great visibility!' : 'Excellente visibilite !')
                : (isEn ? 'Keep improving your profile' : 'Continuez a ameliorer votre profil')}
            </p>
          </div>

          {/* Identity Shield */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 anim-fadeUp-d1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                &#128737; {isEn ? 'Identity Shield' : 'Bouclier Identite'}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isArtisanVerified ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                {completedSteps}/4
              </span>
            </div>

            {/* Visual checklist */}
            <div className="space-y-3 mb-5">
              <StepCheck done={otpVerified} label={isEn ? 'Phone verified (OTP)' : 'Telephone verifie (OTP)'} />
              <StepCheck done={idFrontUploaded} label={isEn ? 'ID front uploaded' : 'CNI recto fourni'} />
              <StepCheck done={idBackUploaded} label={isEn ? 'ID back uploaded' : 'CNI verso fourni'} />
              <StepCheck done={selfieVideoUploaded} label={isEn ? 'Selfie video with ID' : 'Selfie video avec CNI'} />
            </div>

            {/* Toggle verification form */}
            <button
              onClick={() => setShowVerification(!showVerification)}
              className={`
                w-full py-2.5 rounded-xl text-sm font-bold transition
                ${showVerification
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md shadow-green-100'}
              `}
            >
              {showVerification
                ? (isEn ? 'Hide form' : 'Masquer le formulaire')
                : (isEn ? 'Start verification' : 'Commencer la verification')}
            </button>

            {/* Verification form (collapsible) */}
            {showVerification && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 anim-fadeUp">
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  {isEn
                    ? 'Verify your phone with OTP, upload both sides of your ID, and a selfie video holding your card.'
                    : 'Verifiez votre telephone par OTP, ajoutez CNI recto/verso, et une selfie video avec votre carte.'}
                </p>

                {/* Phone + OTP */}
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+237 6XX XX XX XX"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={sendOtp} className="bg-gray-900 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-gray-800 transition">
                    {isEn ? 'Send OTP' : 'Envoyer OTP'}
                  </button>
                  <button onClick={verifyOtp} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl py-2.5 text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition">
                    {isEn ? 'Verify' : 'Verifier'}
                  </button>
                </div>

                {otpSent && (
                  <>
                    <p className="text-[11px] font-bold text-gray-400">
                      {isEn ? 'Demo code:' : 'Code demo :'} {otpCode} | Master: 0000
                    </p>
                    <input
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="123456"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition"
                    />
                  </>
                )}

                {/* ID upload toggles */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={idFrontUploaded} onChange={() => setIdFrontUploaded((v) => !v)} className="sr-only peer" />
                    <span className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:bg-green-500 peer-checked:border-green-500 flex items-center justify-center transition-all">
                      {idFrontUploaded && <span className="text-white text-xs font-bold">{'\u2713'}</span>}
                    </span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition">
                      {isEn ? 'ID card front provided' : 'CNI recto fourni'}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={idBackUploaded} onChange={() => setIdBackUploaded((v) => !v)} className="sr-only peer" />
                    <span className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:bg-green-500 peer-checked:border-green-500 flex items-center justify-center transition-all">
                      {idBackUploaded && <span className="text-white text-xs font-bold">{'\u2713'}</span>}
                    </span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition">
                      {isEn ? 'ID card back provided' : 'CNI verso fourni'}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={selfieVideoUploaded} onChange={() => setSelfieVideoUploaded((v) => !v)} className="sr-only peer" />
                    <span className="w-5 h-5 rounded-md border-2 border-gray-300 peer-checked:bg-green-500 peer-checked:border-green-500 flex items-center justify-center transition-all">
                      {selfieVideoUploaded && <span className="text-white text-xs font-bold">{'\u2713'}</span>}
                    </span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition">
                      {isEn ? 'Selfie video with ID card' : 'Selfie video avec CNI'}
                    </span>
                  </label>
                </div>

                {verificationMessage && (
                  <div className={`text-xs font-bold px-3 py-2 rounded-lg ${verificationMessage.includes('verifie') || verificationMessage.includes('verified') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {verificationMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* WhatsApp - mobile only */}
          <div className="sm:hidden">
            <button className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-green-200/40 flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {isEn ? 'Connect WhatsApp' : 'Connecter WhatsApp'}
            </button>
          </div>
        </aside>

        {/* ---------------------------------------------------------- */}
        {/*  RIGHT CONTENT AREA                                         */}
        {/* ---------------------------------------------------------- */}
        <section className="flex-1 space-y-6 min-w-0">

          {/* TABS (desktop/tablet) */}
          <div className="hidden md:flex gap-1 bg-gray-100 p-1 rounded-2xl anim-fadeUp-d1">
            {([
              { key: 'portfolio' as const, icon: '\uD83D\uDDBC\uFE0F', en: 'Portfolio', fr: 'Portfolio' },
              { key: 'services' as const, icon: '\uD83D\uDEE0\uFE0F', en: 'Services & Pricing', fr: 'Services & Tarifs' },
              { key: 'annonces' as const, icon: '\uD83D\uDCE2', en: 'Post a Need', fr: 'Publier un besoin' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                  ${activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                <span>{tab.icon}</span>
                {isEn ? tab.en : tab.fr}
              </button>
            ))}
          </div>

          {/* Mobile tab title */}
          <div className="md:hidden">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              {activeTab === 'portfolio' && <><span>&#128444;&#65039;</span> {isEn ? 'My Portfolio' : 'Mon Portfolio'}</>}
              {activeTab === 'services' && <><span>&#128736;&#65039;</span> {isEn ? 'My Services' : 'Mes Services'}</>}
              {activeTab === 'annonces' && <><span>&#128226;</span> {isEn ? 'Post a Need' : 'Publier un besoin'}</>}
            </h2>
          </div>

          {/* ======================================================== */}
          {/*  TAB: PORTFOLIO                                           */}
          {/* ======================================================== */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6 anim-fadeUp-d2">
              {/* Motivation banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 p-6 md:p-8 rounded-2xl border border-green-100">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-5">
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-2">
                      {isEn ? 'Show your craftsmanship!' : 'Montrez votre savoir-faire !'}
                    </h2>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed">
                      {isEn
                        ? 'Clients trust what they can see. Add photos of your latest projects to win more jobs.'
                        : 'Les clients font confiance a ce qu\'ils voient. Ajoutez des photos de vos dernieres realisations.'}
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-gray-800 transition w-full md:w-auto text-sm whitespace-nowrap"
                  >
                    + {isEn ? 'Add photos' : 'Ajouter des photos'}
                  </button>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-2xl p-8 md:p-10 flex flex-col items-center text-center cursor-pointer transition-all
                  ${dragOver
                    ? 'border-green-500 bg-green-50 scale-[1.01]'
                    : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50/30'}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                />
                <span className="text-4xl mb-3">&#128247;</span>
                <h4 className="font-extrabold text-gray-900 mb-1 text-sm">
                  {isEn ? 'Drop your photos here' : 'Glissez vos photos ici'}
                </h4>
                <p className="text-xs text-gray-500 font-medium mb-4">
                  {isEn ? 'JPG, PNG -- Max 5MB per photo' : 'JPG, PNG -- Max 5Mo par photo'}
                </p>
                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-5 py-2 rounded-full font-bold text-sm hover:bg-gray-200 transition">
                  {isEn ? 'Browse files' : 'Parcourir les fichiers'}
                </span>
              </div>

              {/* Portfolio grid */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">
                  {isEn ? `Your projects (${portfolioImages.length})` : `Vos realisations (${portfolioImages.length})`}
                </h3>
                {portfolioImages.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                    <span className="text-3xl mb-3 block">&#128444;&#65039;</span>
                    <p className="text-sm text-gray-500 font-medium">
                      {isEn ? 'No photos yet. Upload your first project above!' : 'Aucune photo. Ajoutez votre premier projet ci-dessus !'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {portfolioImages.map((img, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <span className="text-white text-xs font-semibold truncate">{img.name}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPortfolioImages((prev) => prev.filter((_, idx) => idx !== i)); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-500 text-xs font-bold hover:bg-red-50 shadow-sm"
                        >
                          &#10005;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/*  TAB: SERVICES                                            */}
          {/* ======================================================== */}
          {activeTab === 'services' && (
            <div className="space-y-5 anim-fadeUp-d2">
              {services.length === 0 && !showServiceForm ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                  <span className="text-4xl mb-3 block">&#128736;&#65039;</span>
                  <h4 className="font-bold text-gray-900 mb-2">
                    {isEn ? 'No services listed yet' : 'Aucun service pour le moment'}
                  </h4>
                  <p className="text-sm text-gray-500 font-medium mb-5">
                    {isEn ? 'Add your first service to attract clients.' : 'Ajoutez votre premier service pour attirer des clients.'}
                  </p>
                  <button
                    onClick={() => setShowServiceForm(true)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition shadow-md shadow-green-100"
                  >
                    + {isEn ? 'Add a service' : 'Ajouter un service'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Services grid */}
                  {services.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {services.map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-50 rounded-xl flex items-center justify-center">
                              <span className="text-lg">&#128736;</span>
                            </div>
                            <button
                              onClick={() => setServices((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                            >
                              &#10005;
                            </button>
                          </div>
                          <h4 className="font-bold text-gray-900 mb-1">{s.name}</h4>
                          {s.desc && <p className="text-xs text-gray-500 font-medium mb-3 line-clamp-2">{s.desc}</p>}
                          {s.price && (
                            <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                              {s.price} FCFA
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add service form */}
                  {showServiceForm ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 anim-fadeUp">
                      <h4 className="font-bold text-gray-900 text-sm">
                        {isEn ? 'New service' : 'Nouveau service'}
                      </h4>
                      <input
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        placeholder={isEn ? 'Service name (e.g. Plumbing repair)' : 'Nom du service (ex: Reparation plomberie)'}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition"
                      />
                      <textarea
                        value={serviceDesc}
                        onChange={(e) => setServiceDesc(e.target.value)}
                        placeholder={isEn ? 'Description (optional)' : 'Description (optionnel)'}
                        rows={2}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition resize-none"
                      />
                      <input
                        value={servicePrice}
                        onChange={(e) => setServicePrice(e.target.value)}
                        placeholder={isEn ? 'Price in FCFA (e.g. 15000)' : 'Prix en FCFA (ex: 15000)'}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition"
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={addService}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition"
                        >
                          {isEn ? 'Save service' : 'Enregistrer'}
                        </button>
                        <button
                          onClick={() => setShowServiceForm(false)}
                          className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition"
                        >
                          {isEn ? 'Cancel' : 'Annuler'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowServiceForm(true)}
                      className="w-full border-2 border-dashed border-gray-200 bg-white text-gray-500 font-bold py-4 rounded-2xl hover:border-green-400 hover:text-green-600 hover:bg-green-50/30 transition text-sm"
                    >
                      + {isEn ? 'Add another service' : 'Ajouter un autre service'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/*  TAB: ANNONCES                                            */}
          {/* ======================================================== */}
          {activeTab === 'annonces' && (
            <div className="space-y-6 anim-fadeUp-d2">
              {/* Recruitment banner */}
              <div className="relative overflow-hidden bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 p-6 md:p-8 rounded-2xl border border-green-100">
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-green-200/20 rounded-full translate-y-1/2 translate-x-1/4" />
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-5">
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-2">
                      {isEn ? 'Hire talent or an apprentice' : 'Recrutez un talent ou un apprenti'}
                    </h2>
                    <p className="text-sm text-gray-600 font-medium leading-relaxed">
                      {isEn
                        ? 'Business growing? Post a job to quickly find extra hands, a motivated apprentice, or an expert.'
                        : 'Activite qui grandit ? Publiez une offre pour trouver rapidement des bras supplementaires ou un apprenti.'}
                    </p>
                  </div>
                  <Link
                    href={localizePath('/publier')}
                    className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-gray-800 transition text-sm whitespace-nowrap text-center w-full md:w-auto"
                  >
                    + {isEn ? 'Post a job ad' : 'Publier une annonce'}
                  </Link>
                </div>
              </div>

              {/* Active ads tracker */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                  <span>&#128203;</span> {isEn ? 'Your active ads' : 'Vos annonces actives'}
                </h3>

                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">&#128226;</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1 text-sm">
                    {isEn ? 'No active ads' : 'Aucune annonce en cours'}
                  </h4>
                  <p className="text-sm text-gray-500 font-medium mb-5">
                    {isEn
                      ? 'You haven\'t posted any job offers yet.'
                      : 'Vous n\'avez pas encore publie d\'offre pour rechercher un talent.'}
                  </p>
                  <button
                    onClick={publishServiceNeed}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition shadow-md shadow-green-100"
                  >
                    {isEn ? 'Simulate publication with moderation' : 'Simuler une publication avec moderation'}
                  </button>
                  <p className="mt-3 text-xs text-gray-400 font-medium">
                    {isEn ? 'First 3 publications go to Pending for admin review.' : 'Les 3 premieres publications passent en attente pour validation admin.'}
                  </p>
                  {verificationMessage && activeTab === 'annonces' && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold">
                      &#9888;&#65039; {verificationMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ============================================================ */}
      {/*  MOBILE BOTTOM NAVIGATION                                     */}
      {/* ============================================================ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-200 z-50 safe-area-pb">
        <div className="grid grid-cols-5 h-16">
          {([
            { key: 'home' as const, icon: '\u2302', label: isEn ? 'Home' : 'Accueil' },
            { key: 'portfolio' as const, icon: '\uD83D\uDDBC\uFE0F', label: 'Portfolio' },
            { key: 'services' as const, icon: '\uD83D\uDEE0\uFE0F', label: 'Services' },
            { key: 'annonces' as const, icon: '\uD83D\uDCE2', label: isEn ? 'Ads' : 'Annonces' },
            { key: 'account' as const, icon: '\uD83D\uDC64', label: isEn ? 'Account' : 'Compte' },
          ] as const).map((item) => {
            const isActive = mobileTab === item.key || (item.key !== 'home' && item.key !== 'account' && activeTab === item.key);
            return (
              <button
                key={item.key}
                onClick={() => {
                  setMobileTab(item.key);
                  if (item.key === 'home') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${isActive ? 'text-green-600' : 'text-gray-400'}`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
