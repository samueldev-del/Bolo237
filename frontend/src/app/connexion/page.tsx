"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';
import { createUser, loginUser } from '@/lib/api';

type Role = 'chercheur' | 'entreprise' | 'artisan';

const ROLE_STORAGE_KEY = '237jobs-account-role';
const USER_KEY = '237jobs-user';

const ROLE_MAP: Record<Role, string> = {
  chercheur: 'CANDIDAT',
  entreprise: 'ENTREPRISE',
  artisan: 'ARTISAN',
};

const BACKEND_ROLE_TO_LOCAL: Record<string, Role> = {
  CANDIDAT: 'chercheur',
  ENTREPRISE: 'entreprise',
  ARTISAN: 'artisan',
};

export default function Connexion() {
  const router = useRouter();
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  // Mode & step
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1 = rôle, 2 = infos + création

  // Signup
  const [selectedRole, setSelectedRole] = useState<Role>('chercheur');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Champs spécifiques entreprise
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  // Champs spécifiques artisan
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // UI
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDashboardRoute = (role: Role) => {
    if (role === 'entreprise') return localizePath('/dashboard-entreprise');
    if (role === 'artisan') return localizePath('/dashboard-artisan');
    return localizePath('/dashboard');
  };

  // ── STEP 2 VALIDATION & SIGNUP ──
  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setAuthError(isEn ? 'Please enter your first and last name.' : 'Veuillez saisir votre prénom et nom.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setAuthError(isEn ? 'Please enter a valid email address.' : 'Veuillez saisir une adresse email valide.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setAuthError(isEn ? 'Password must be at least 6 characters.' : 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (selectedRole === 'entreprise' && !companyName.trim()) {
      setAuthError(isEn ? 'Please enter your company name.' : 'Veuillez saisir le nom de votre entreprise.');
      return;
    }
    if (selectedRole === 'artisan' && !specialty.trim()) {
      setAuthError(isEn ? 'Please enter your specialty.' : 'Veuillez saisir votre spécialité.');
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
        email: email.trim(),
        password: password,
        name: fullName,
        role: ROLE_MAP[selectedRole],
      });

      if (typeof window !== 'undefined') {
        const localRole = BACKEND_ROLE_TO_LOCAL[user.role] || 'chercheur';
        window.localStorage.setItem(USER_KEY, JSON.stringify(user));
        window.localStorage.setItem(ROLE_STORAGE_KEY, localRole);
        window.localStorage.setItem('237jobs-phone-verified', 'true');
        router.push(getDashboardRoute(localRole));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isEn ? 'Account creation failed.' : 'Échec de la création du compte.');
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── LOGIN ──
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
        window.localStorage.setItem('237jobs-phone-verified', 'true');
        router.push(getDashboardRoute(localRole));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isEn ? 'Login failed.' : 'Échec de la connexion.');
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Role config ──
  const roleConfig = {
    chercheur: {
      icon: '👤',
      title: isEn ? 'I\'m looking for a job' : 'Je cherche un emploi',
      subtitle: isEn ? 'Candidate' : 'Candidat',
      color: 'green',
      desc: isEn ? 'Access job offers, build your CV, and apply directly.' : 'Accédez aux offres, créez votre CV et postulez directement.',
      heroTitle: isEn ? 'Find your dream job in Cameroon' : 'Trouvez votre emploi idéal au Cameroun',
      heroDesc: isEn ? 'Thousands of opportunities across all sectors and regions.' : 'Des milliers d\'opportunités dans tous les secteurs et régions.',
    },
    entreprise: {
      icon: '🏢',
      title: isEn ? 'I\'m hiring' : 'Je recrute',
      subtitle: isEn ? 'Company' : 'Entreprise',
      color: 'blue',
      desc: isEn ? 'Post job offers and find the best talent in Cameroon.' : 'Publiez des offres et trouvez les meilleurs talents au Cameroun.',
      heroTitle: isEn ? 'Recruit the best talent in Cameroon' : 'Recrutez les meilleurs talents du Cameroun',
      heroDesc: isEn ? 'Post your job offers and reach thousands of qualified candidates.' : 'Publiez vos offres et touchez des milliers de candidats qualifiés.',
    },
    artisan: {
      icon: '🛠️',
      title: isEn ? 'I offer my services' : 'Je propose mes services',
      subtitle: 'Artisan',
      color: 'amber',
      desc: isEn ? 'Showcase your skills and get clients near you.' : 'Montrez votre savoir-faire et trouvez des clients près de chez vous.',
      heroTitle: isEn ? 'Grow your artisan business' : 'Développez votre activité artisanale',
      heroDesc: isEn ? 'Get discovered by clients across Cameroon looking for your skills.' : 'Soyez découvert par des clients dans tout le Cameroun.',
    },
  };

  const currentRole = roleConfig[selectedRole];
  const borderColor = currentRole.color === 'green' ? 'border-green-500' : currentRole.color === 'blue' ? 'border-blue-500' : 'border-amber-500';
  const bgColor = currentRole.color === 'green' ? 'bg-green-50' : currentRole.color === 'blue' ? 'bg-blue-50' : 'bg-amber-50';

  // Hero gradient par rôle
  const heroGradient = selectedRole === 'entreprise'
    ? 'linear-gradient(135deg, rgba(30, 58, 138, 0.85), rgba(17, 24, 39, 0.75))'
    : selectedRole === 'artisan'
      ? 'linear-gradient(135deg, rgba(120, 53, 15, 0.80), rgba(17, 24, 39, 0.75))'
      : 'linear-gradient(135deg, rgba(2, 44, 34, 0.80), rgba(17, 24, 39, 0.75))';

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-black flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-2 min-h-[720px]">

        {/* ═══════ PANNEAU GAUCHE (Hero dynamique) ═══════ */}
        <div
          className="hidden md:flex relative"
          style={{ backgroundImage: `${heroGradient}, url('/auth-hero.svg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 p-10 lg:p-14 flex flex-col justify-between text-white">
            <Link href={localizePath('/')}>
              <Image src="/logo-white.svg" alt="237jobs" width={160} height={42} priority className="h-10 w-auto" />
            </Link>

            <div>
              {!isLogin && (
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-bold mb-6">
                  <span>{currentRole.icon}</span>
                  <span>{currentRole.subtitle}</span>
                </div>
              )}
              <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight mb-4">
                {isLogin
                  ? (isEn ? 'Welcome back to 237jobs.' : 'Bon retour sur 237jobs.')
                  : currentRole.heroTitle}
              </h1>
              <p className="text-white/80 font-medium text-lg">
                {isLogin
                  ? (isEn ? 'Sign in to access your dashboard and manage your profile.' : 'Connectez-vous pour accéder à votre espace et gérer votre profil.')
                  : currentRole.heroDesc}
              </p>
            </div>

            {/* Déco subtile */}
            <div className="flex items-center gap-3 text-white/40 text-xs font-medium">
              <span className="w-8 h-[1px] bg-white/20"></span>
              {isEn ? 'Secured platform' : 'Plateforme sécurisée'}
              <span>•</span>
              {isEn ? 'Anti-fraud protection' : 'Protection anti-fraude'}
            </div>
          </div>
        </div>

        {/* ═══════ PANNEAU DROIT (Formulaire) ═══════ */}
        <div className="relative p-6 sm:p-8 lg:p-10 flex flex-col overflow-y-auto max-h-[90vh]">

          {/* Logo mobile + Bouton fermer */}
          <div className="flex items-center justify-between mb-6">
            <div className="md:hidden">
              <Image src="/logo.svg" alt="237jobs" width={120} height={32} className="h-8 w-auto" />
            </div>
            <Link href={localizePath('/')} className="text-gray-400 hover:text-gray-600 transition ml-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>

          {/* Toggle Connexion / Inscription */}
          <div className="bg-gray-100 p-1 rounded-full inline-flex mb-8 self-start">
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

          {/* ━━━━━ CONNEXION ━━━━━ */}
          {isLogin && (
            <div className="space-y-5 flex-1">
              <div>
                <h2 className="text-2xl font-extrabold mb-1">{isEn ? 'Sign in' : 'Connexion'}</h2>
                <p className="text-sm text-gray-500">{isEn ? 'Access your candidate, company, or artisan dashboard.' : 'Accédez à votre espace candidat, entreprise ou artisan.'}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 block">{isEn ? 'Email' : 'Adresse email'}</label>
                  <input
                    type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nom@example.com"
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-[15px]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-gray-700">{isEn ? 'Password' : 'Mot de passe'}</label>
                    <Link href="#" className="text-xs font-bold text-green-700 hover:underline">
                      {isEn ? 'Forgot?' : 'Oublié ?'}
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-[15px] pr-12"
                    />
                    <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold">
                      {showLoginPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogin} disabled={isSubmitting}
                className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition shadow-md disabled:opacity-60 text-[15px]"
              >
                {isSubmitting ? (isEn ? 'Signing in...' : 'Connexion...') : (isEn ? 'Sign in' : 'Se connecter')}
              </button>

              <p className="text-xs text-gray-400 text-center font-medium">
                {isEn ? 'You\'ll be redirected to your dashboard based on your role.' : 'Redirection automatique vers votre tableau de bord.'}
              </p>
            </div>
          )}

          {/* ━━━━━ INSCRIPTION ━━━━━ */}
          {!isLogin && (
            <div className="space-y-5 flex-1">

              {/* ── ÉTAPE 1 : Choix du rôle ── */}
              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-2xl font-extrabold mb-1">{isEn ? 'Who are you?' : 'Qui êtes-vous ?'}</h2>
                    <p className="text-sm text-gray-500">{isEn ? 'Choose your account type to get started.' : 'Choisissez votre type de compte pour commencer.'}</p>
                  </div>

                  <div className="space-y-3">
                    {(Object.keys(roleConfig) as Role[]).map((role) => {
                      const cfg = roleConfig[role];
                      const isActive = selectedRole === role;
                      const activeBorder = cfg.color === 'green' ? 'border-green-500 bg-green-50' : cfg.color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-amber-500 bg-amber-50';
                      const activeRing = cfg.color === 'green' ? 'ring-green-200' : cfg.color === 'blue' ? 'ring-blue-200' : 'ring-amber-200';
                      return (
                        <button
                          key={role}
                          onClick={() => setSelectedRole(role)}
                          className={`w-full border-2 rounded-2xl p-5 text-left transition-all duration-200 flex items-start gap-4 ${isActive ? `${activeBorder} ring-2 ${activeRing}` : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                        >
                          <span className="text-3xl mt-0.5">{cfg.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[15px] text-black">{cfg.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{cfg.desc}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 transition ${isActive ? (cfg.color === 'green' ? 'border-green-500 bg-green-500' : cfg.color === 'blue' ? 'border-blue-500 bg-blue-500' : 'border-amber-500 bg-amber-500') : 'border-gray-300'}`}>
                            {isActive && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => { setStep(2); setAuthError(''); }}
                    className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition shadow-md text-[15px]"
                  >
                    {isEn ? 'Continue' : 'Continuer'} →
                  </button>
                </>
              )}

              {/* ── ÉTAPE 2 : Informations ── */}
              {step === 2 && (
                <>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStep(1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                      <h2 className="text-2xl font-extrabold">{isEn ? 'Your information' : 'Vos informations'}</h2>
                      <p className="text-sm text-gray-500">
                        {isEn ? `Step 2/2 — ${roleConfig[selectedRole].subtitle} account` : `Étape 2/2 — Compte ${roleConfig[selectedRole].subtitle}`}
                      </p>
                    </div>
                  </div>

                  {/* Badge rôle sélectionné */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${bgColor} ${borderColor} border`}>
                    <span>{currentRole.icon}</span>
                    {currentRole.subtitle}
                  </div>

                  <div className="space-y-3">
                    {/* Nom / Prénom */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'First name' : 'Prénom'} *</label>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                          placeholder={selectedRole === 'entreprise' ? (isEn ? 'Contact first name' : 'Prénom du contact') : (isEn ? 'First name' : 'Prénom')}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-[15px]" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Last name' : 'Nom'} *</label>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                          placeholder={selectedRole === 'entreprise' ? (isEn ? 'Contact last name' : 'Nom du contact') : (isEn ? 'Last name' : 'Nom')}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-[15px]" />
                      </div>
                    </div>

                    {/* Champs spécifiques ENTREPRISE */}
                    {selectedRole === 'entreprise' && (
                      <>
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Company name' : 'Nom de l\'entreprise'} *</label>
                          <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                            placeholder={isEn ? 'e.g. MTN Cameroon' : 'ex. MTN Cameroun'}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[15px]" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Sector' : 'Secteur d\'activité'}</label>
                          <select value={sector} onChange={(e) => setSector(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-[15px] bg-white">
                            <option value="">{isEn ? 'Select a sector' : 'Sélectionnez un secteur'}</option>
                            <option value="tech">Tech / IT</option>
                            <option value="finance">{isEn ? 'Finance / Banking' : 'Finance / Banque'}</option>
                            <option value="commerce">Commerce / Distribution</option>
                            <option value="construction">BTP / Construction</option>
                            <option value="sante">{isEn ? 'Health' : 'Santé'}</option>
                            <option value="education">{isEn ? 'Education' : 'Éducation'}</option>
                            <option value="transport">Transport / Logistique</option>
                            <option value="agriculture">Agriculture / Agroalimentaire</option>
                            <option value="other">{isEn ? 'Other' : 'Autre'}</option>
                          </select>
                        </div>
                      </>
                    )}

                    {/* Champs spécifiques ARTISAN */}
                    {selectedRole === 'artisan' && (
                      <>
                        <div>
                          <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Specialty' : 'Spécialité'} *</label>
                          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-[15px] bg-white">
                            <option value="">{isEn ? 'Choose your trade' : 'Choisissez votre métier'}</option>
                            <option value="plomberie">{isEn ? 'Plumbing' : 'Plomberie'}</option>
                            <option value="electricite">{isEn ? 'Electrical' : 'Électricité'}</option>
                            <option value="menuiserie">{isEn ? 'Carpentry' : 'Menuiserie'}</option>
                            <option value="maconnerie">{isEn ? 'Masonry' : 'Maçonnerie'}</option>
                            <option value="peinture">{isEn ? 'Painting' : 'Peinture'}</option>
                            <option value="couture">{isEn ? 'Tailoring' : 'Couture'}</option>
                            <option value="coiffure">{isEn ? 'Hairdressing' : 'Coiffure'}</option>
                            <option value="mecanique">{isEn ? 'Mechanic' : 'Mécanique'}</option>
                            <option value="soudure">{isEn ? 'Welding' : 'Soudure'}</option>
                            <option value="carrelage">{isEn ? 'Tiling' : 'Carrelage'}</option>
                            <option value="climatisation">{isEn ? 'HVAC / AC' : 'Climatisation'}</option>
                            <option value="informatique">{isEn ? 'IT Repair' : 'Dépannage informatique'}</option>
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

                    {/* Email + Mot de passe (communs) */}
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Email *</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder={selectedRole === 'entreprise' ? (isEn ? 'company@email.com' : 'entreprise@email.com') : 'nom@email.com'}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-[15px]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Password' : 'Mot de passe'} *</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                          placeholder={isEn ? '6 characters minimum' : '6 caractères minimum'}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-[15px] pr-12" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                          {showPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button onClick={handleSignup} disabled={isSubmitting}
                    className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition shadow-md text-[15px] disabled:opacity-60">
                    {isSubmitting
                      ? (isEn ? 'Creating account...' : 'Création du compte...')
                      : (isEn ? `Create my ${roleConfig[selectedRole].subtitle.toLowerCase()} account` : `Créer mon compte ${roleConfig[selectedRole].subtitle.toLowerCase()}`)}
                  </button>
                </>
              )}

            </div>
          )}

          {/* ── Erreur ── */}
          {authError && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-red-500 text-sm mt-0.5">⚠️</span>
              <p className="text-sm font-bold text-red-700">{authError}</p>
            </div>
          )}

          {/* Séparateur + toggle */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 font-medium">
              {isLogin
                ? (isEn ? 'No account yet? ' : 'Pas encore de compte ? ')
                : (isEn ? 'Already have an account? ' : 'Déjà un compte ? ')}
              <button
                onClick={() => { setIsLogin(!isLogin); setStep(1); setAuthError(''); }}
                className="text-green-700 font-bold hover:underline"
              >
                {isLogin ? (isEn ? 'Sign up' : 'S\'inscrire') : (isEn ? 'Sign in' : 'Se connecter')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
