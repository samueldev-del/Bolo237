"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { canPublishUnlimited, containsBlockedKeyword, getModerationStatusForFirstPublications } from '@/lib/trustShield';
import {
  sendOtp as apiSendOtp,
  verifyOtp as apiVerifyOtp,
  createJob,
  fetchUserNotifications,
  markAllNotificationsAsRead,
  fetchVerificationStatus,
  createVerificationSubmission,
  type ApiNotification,
  type VerificationStatus,
} from '@/lib/api';
import { fileToImageDataUrl } from '@/lib/filePreview';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */
type JobEntry = {
  id: number;
  title: string;
  contract: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
};

type SidebarSection = 'dashboard' | 'post' | 'listings' | 'applications' | 'interviews' | 'cvtheque' | 'profile' | 'billing';

/* ────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────── */
export default function DashboardEntreprise() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  // Mobile sidebar
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active sidebar section
  const [activeSection, setActiveSection] = useState<SidebarSection>('dashboard');

  // User info from localStorage
  const [userId, setUserId] = useState(0);
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // OTP flow
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  // Company verification
  const [niu, setNiu] = useState('');
  const [rccm, setRccm] = useState('');
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyDocFile, setCompanyDocFile] = useState<File | null>(null);
  const [documentsVerificationStatus, setDocumentsVerificationStatus] = useState<VerificationStatus>('not_submitted');

  // Job form - multi-step wizard
  const [wizardStep, setWizardStep] = useState(1);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobContract, setJobContract] = useState('CDI');
  const [jobLocation, setJobLocation] = useState('');
  const [jobSalary, setJobSalary] = useState('');

  // Published jobs
  const [publishMessage, setPublishMessage] = useState('');
  const [publishMessageType, setPublishMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [jobsPublishedCount, setJobsPublishedCount] = useState(0);
  const [publishedJobs, setPublishedJobs] = useState<JobEntry[]>([]);

  const isRecruiterVerified = niu.trim().length > 4 || rccm.trim().length > 4;
  const accountKey = (companyName || userName || phone || 'entreprise').toLowerCase();
  const isEnterprisePublishingReady = otpVerified && documentsVerificationStatus === 'approved';

  // Load user info
  useEffect(() => {
    try {
      const raw = localStorage.getItem('bolo237-user');
      if (raw) {
        const user = JSON.parse(raw);
        setUserId(Number(user.id || 0));
        setUserName(user.name || user.fullName || user.email || '');
        setCompanyName(user.company || user.companyName || '');
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    const loadVerificationStatus = async () => {
      if (!accountKey) {
        setDocumentsVerificationStatus('not_submitted');
        return;
      }
      try {
        const status = await fetchVerificationStatus('entreprise', accountKey);
        setDocumentsVerificationStatus(status);
      } catch {
        setDocumentsVerificationStatus('not_submitted');
      }
    };

    loadVerificationStatus();
  }, [accountKey]);

  useEffect(() => {
    if (!userId) return;

    let active = true;

    const loadNotifications = async () => {
      try {
        const res = await fetchUserNotifications(userId, { limit: 20 });
        if (!active) return;
        setNotifications(res.items);
        setUnreadNotifications(res.unreadCount);
      } catch {
        if (!active) return;
        setNotifications([]);
        setUnreadNotifications(0);
      }
    };

    loadNotifications();
    const timer = setInterval(loadNotifications, 20000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [userId]);

  // Get company initials
  const getInitials = useCallback(() => {
    const name = companyName || userName || (isEn ? 'My Company' : 'Mon Entreprise');
    return name
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [companyName, userName, isEn]);

  /* ── OTP Handlers ── */
  const sendOtp = async () => {
    if (!phone.trim()) {
      setPublishMessage(isEn ? 'Enter a valid phone number before sending OTP.' : 'Saisissez un numero de telephone valide avant l\'envoi OTP.');
      setPublishMessageType('error');
      return;
    }
    setPublishMessage('');
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
    setPublishMessage('');
    try {
      const res = await apiVerifyOtp(phone, otpInput.trim());
      if (res.verified) {
        setOtpVerified(true);
        setPublishMessage(isEn ? 'Phone verified successfully!' : 'Numero de telephone verifie avec succes!');
        setPublishMessageType('success');
      } else {
        setOtpVerified(false);
        setPublishMessage(res.error || (isEn ? 'Invalid OTP code.' : 'Code OTP invalide.'));
        setPublishMessageType('error');
      }
    } catch {
      if (otpInput.trim() === otpCode) {
        setOtpVerified(true);
        setPublishMessage(isEn ? 'Phone verified successfully!' : 'Numero de telephone verifie avec succes!');
        setPublishMessageType('success');
      } else {
        setOtpVerified(false);
        setPublishMessage(isEn ? 'Invalid OTP code.' : 'Code OTP invalide.');
        setPublishMessageType('error');
      }
    }
  };

  const verifyCompanyDocuments = async () => {
    if (!companyLogoFile) {
      setPublishMessage(isEn ? 'Upload your company logo before verification.' : 'Telechargez le logo de l entreprise avant verification.');
      setPublishMessageType('error');
      return;
    }
    if (!companyDocFile) {
      setPublishMessage(isEn ? 'Upload NIU or RCCM supporting document first.' : 'Telechargez d abord le justificatif NIU ou RCCM.');
      setPublishMessageType('error');
      return;
    }
    if (!isRecruiterVerified) {
      setPublishMessage(isEn ? 'Enter a valid NIU or RCCM before verification.' : 'Renseignez un NIU ou RCCM valide avant verification.');
      setPublishMessageType('error');
      return;
    }

    const [logoPreview, legalDocPreview] = await Promise.all([
      fileToImageDataUrl(companyLogoFile),
      fileToImageDataUrl(companyDocFile),
    ]);

    await createVerificationSubmission({
      role: 'entreprise',
      accountKey,
      displayName: companyName || userName || 'Entreprise',
      phone,
      payload: {
        niu,
        rccm,
        hasLogo: !!companyLogoFile,
        logoFileName: companyLogoFile?.name ?? null,
        legalDocFileName: companyDocFile?.name ?? null,
        logoPreview,
        legalDocPreview,
      },
    });
    setDocumentsVerificationStatus('pending');
    setPublishMessage(
      isEn
        ? 'Verification request sent. Waiting for Super Admin approval.'
        : 'Demande de verification envoyee. En attente d approbation Super Admin.'
    );
    setPublishMessageType('info');
  };

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);

  /* ── Publish Job ── */
  const publishJob = async () => {
    const blocked = containsBlockedKeyword(`${jobTitle} ${jobDescription}`);
    if (!otpVerified) {
      setPublishMessage(isEn ? 'OTP phone verification is mandatory for publication.' : 'La verification OTP du numero est obligatoire pour publier.');
      setPublishMessageType('error');
      return;
    }
    if (!jobTitle.trim() || !jobDescription.trim()) {
      setPublishMessage(isEn ? 'Fill in title and description first.' : 'Renseignez d\'abord le titre et la description.');
      setPublishMessageType('error');
      return;
    }
    if (!companyLogoFile) {
      setPublishMessage(isEn ? 'Company logo is required before publication.' : 'Le logo de l entreprise est obligatoire avant publication.');
      setPublishMessageType('error');
      return;
    }
    if (documentsVerificationStatus !== 'approved') {
      setPublishMessage(
        isEn
          ? 'Document verification must be approved by Super Admin before publication.'
          : 'La verification documentaire doit etre approuvee par le Super Admin avant publication.'
      );
      setPublishMessageType('error');
      return;
    }
    if (blocked) {
      setPublishMessage(`${isEn ? 'Blocked by anti-fraud filter keyword:' : 'Bloque par le filtre anti-fraude, mot-cle:'} "${blocked}"`);
      setPublishMessageType('error');
      return;
    }
    if (jobsPublishedCount >= 3 && !canPublishUnlimited(isRecruiterVerified)) {
      setPublishMessage(
        isEn
          ? 'Unlimited publications are locked. Add NIU or RCCM to get the Verified Recruiter badge.'
          : 'La publication illimitee est bloquee. Ajoutez le NIU ou le RCCM pour obtenir le badge Recruteur Verifie.'
      );
      setPublishMessageType('error');
      return;
    }

    // Get user from localStorage for authorId
    let authorId = 0;
    let authorCompany = companyName || userName || '';
    try {
      const raw = localStorage.getItem('bolo237-user');
      if (raw) {
        const user = JSON.parse(raw);
        authorId = user.id;
        if (!authorCompany) {
          authorCompany = user.company || user.companyName || user.name || user.email || '';
        }
      }
    } catch {
      // ignore parse errors
    }

    if (!authorId) {
      setPublishMessage(isEn ? 'User session not found. Please log in again.' : 'Session utilisateur introuvable. Veuillez vous reconnecter.');
      setPublishMessageType('error');
      return;
    }

    setIsPublishing(true);
    setPublishMessage(isEn ? 'Publishing...' : 'Publication en cours...');
    setPublishMessageType('info');

    try {
      const created = await createJob({
        title: jobTitle.trim(),
        company: authorCompany,
        location: jobLocation.trim() || 'Cameroun',
        description: jobDescription.trim(),
        salary: jobSalary.trim() || undefined,
        authorId,
      });

      const nextCount = jobsPublishedCount + 1;
      const moderationStatus = getModerationStatusForFirstPublications(jobsPublishedCount);
      setJobsPublishedCount(nextCount);

      // Add returned job to local list for immediate UI feedback
      const newJob: JobEntry = {
        id: created.id,
        title: created.title,
        contract: jobContract,
        status: moderationStatus === 'en-attente' ? 'pending' : 'approved',
        date: new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR'),
      };
      setPublishedJobs(prev => [newJob, ...prev]);

      setPublishMessage(
        moderationStatus === 'en-attente'
          ? isEn
            ? `Published in moderation queue (${nextCount}/3). Status: Pending review by admin.`
            : `Publication placee en quarantaine (${nextCount}/3). Statut: En attente de validation admin.`
          : isEn
            ? 'Publication accepted and online.'
            : 'Publication acceptee et mise en ligne.'
      );
      setPublishMessageType(moderationStatus === 'en-attente' ? 'info' : 'success');
      setJobTitle('');
      setJobDescription('');
      setJobContract('CDI');
      setJobLocation('');
      setJobSalary('');
      setWizardStep(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPublishMessage(
        isEn
          ? `Failed to publish: ${message}`
          : `Echec de la publication: ${message}`
      );
      setPublishMessageType('error');
    } finally {
      setIsPublishing(false);
    }
  };

  /* ── Navigate sidebar ── */
  const navigateTo = (section: SidebarSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
    setPublishMessage('');
  };

  const openApplications = async () => {
    navigateTo('applications');
    if (!userId || unreadNotifications === 0) return;

    setUnreadNotifications(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await markAllNotificationsAsRead(userId);
    } catch {
      // keep UI responsive even if read-all fails
    }
  };

  /* ── Status badge helper ── */
  const statusBadge = (status: JobEntry['status']) => {
    const map = {
      pending: {
        label: isEn ? 'Pending' : 'En attente',
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      },
      approved: {
        label: isEn ? 'Approved' : 'Approuvee',
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
      },
      rejected: {
        label: isEn ? 'Rejected' : 'Rejetee',
        bg: 'bg-red-100 text-red-800 border-red-200',
        dot: 'bg-red-500',
      },
    };
    const s = map[status];
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

  /* ────────────────────────────────────────────
     Sidebar menu items
     ──────────────────────────────────────────── */
  const menuItems: { key: SidebarSection; icon: string; label: string }[] = [
    { key: 'dashboard', icon: '\u{1F3E0}', label: isEn ? 'Dashboard' : 'Tableau de bord' },
    { key: 'post', icon: '\u{2795}', label: isEn ? 'Post a Job' : 'Publier une offre' },
    { key: 'listings', icon: '\u{1F4CB}', label: isEn ? 'My Listings' : 'Mes annonces' },
    { key: 'applications', icon: '\u{1F465}', label: isEn ? 'Applications' : 'Candidatures' },
    { key: 'interviews', icon: '\u{1F4C5}', label: isEn ? 'Interviews' : 'Entretiens' },
    { key: 'cvtheque', icon: '\u{1F4DA}', label: 'CVtheque' },
    { key: 'profile', icon: '\u{1F3E2}', label: isEn ? 'Company Profile' : 'Profil Entreprise' },
    { key: 'billing', icon: '\u{1F4B3}', label: isEn ? 'Billing' : 'Facturation' },
  ];

  /* ────────────────────────────────────────────
     RENDER
     ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">

      {/* ═══════════════════════════════════════
          TOP HEADER BAR
          ═══════════════════════════════════════ */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-16 flex items-center px-4 lg:px-8">
        <div className="w-full max-w-[1440px] mx-auto flex justify-between items-center">
          {/* Left: Logo + hamburger on mobile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <Link href={localizePath('/')} className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Bolo237" width={120} height={32} className="h-8 w-auto" />
              <span className="text-sm font-medium text-gray-400 hidden sm:inline">| {isEn ? 'Recruiter Space' : 'Espace Recruteur'}</span>
            </Link>
          </div>

          {/* Right: User badge */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              onClick={openApplications}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition"
              title={isEn ? 'Open applications inbox' : 'Ouvrir la boite de candidatures'}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>

            {/* User avatar */}
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-gray-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                {getInitials()}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-bold text-gray-800 leading-tight">{companyName || (isEn ? 'My Company' : 'Mon Entreprise')}</p>
                <p className="text-[11px] text-gray-400 font-medium leading-tight">{isEn ? 'Recruiter' : 'Recruteur'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════
          BODY: SIDEBAR + CONTENT
          ═══════════════════════════════════════ */}
      <div className="flex-1 flex">

        {/* ── Mobile overlay ── */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* ── SIDEBAR ── */}
        <aside className={`
          fixed lg:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-72 lg:w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto flex-shrink-0
        `}>
          {/* Gradient company header */}
          <div className="p-5">
            <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 rounded-2xl p-5 text-white relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-extrabold mb-3 border border-white/20">
                  {getInitials()}
                </div>
                <p className="font-bold text-[15px] leading-tight truncate">
                  {companyName || (isEn ? 'My Company' : 'Mon Entreprise')}
                </p>
                <p className="text-white/70 text-xs font-medium mt-0.5">
                  {userName || (isEn ? 'Recruiter' : 'Recruteur')}
                </p>
                <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full mt-3 ${
                  isRecruiterVerified
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-400/90 text-amber-900'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isRecruiterVerified ? 'bg-green-300' : 'bg-amber-700'}`} />
                  {isRecruiterVerified
                    ? (isEn ? 'VERIFIED RECRUITER' : 'RECRUTEUR VERIFIE')
                    : (isEn ? 'UNVERIFIED' : 'NON VERIFIE')}
                </div>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="px-3 pb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2">
              {isEn ? 'Navigation' : 'Navigation'}
            </p>
            {menuItems.map(item => (
              <button
                key={item.key}
                onClick={() => navigateTo(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-0.5
                  ${activeSection === item.key
                    ? 'bg-green-50 text-green-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <span className="text-base w-6 text-center">{item.icon}</span>
                <span>{item.label}</span>
                {item.key === 'applications' && (
                  <span className="ml-auto bg-green-600 text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </button>
            ))}

            {/* Separator */}
            <div className="border-t border-gray-100 my-3" />

            {/* Launch offer banner in sidebar */}
            <div className="mx-2 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl p-4 text-white">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">
                {isEn ? 'Launch offer' : 'Offre de lancement'}
              </p>
              <p className="text-[13px] font-bold leading-snug">
                {isEn ? '100% Free' : '100% Gratuit'}
              </p>
              <p className="text-[11px] opacity-80 mt-1 leading-snug">
                {isEn ? 'Post unlimited jobs during launch phase' : 'Publiez sans limite pendant le lancement'}
              </p>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-100 my-3" />

            {/* Logout */}
            <Link
              href={localizePath('/')}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition"
            >
              <span className="text-base w-6 text-center">{'\u{1F6AA}'}</span>
              <span>{isEn ? 'Logout' : 'Deconnexion'}</span>
            </Link>
          </nav>
        </aside>

        {/* ── MAIN CONTENT AREA ── */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-8">
          <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 sm:py-8">

            {/* Welcome banner */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                {isEn ? 'Welcome back' : 'Bienvenue'}{userName ? `, ${userName.split(' ')[0]}` : ''} {'\u{1F44B}'}
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">
                {isEn ? 'Manage your job listings and find the best candidates.' : 'Gerez vos offres d\'emploi et trouvez les meilleurs candidats.'}
              </p>
            </div>

            {/* ═══ DASHBOARD VIEW ═══ */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                {/* Enterprise Lock Banner */}
                {(() => {
                  const hasLogo = !!companyLogoFile;
                  const hasDoc = !!companyDocFile;
                  const isApproved = documentsVerificationStatus === 'approved';
                  const allReady = hasLogo && hasDoc && isApproved;
                  return (
                    <div className={`rounded-2xl border-2 p-4 sm:p-5 transition-all ${
                      allReady
                        ? 'bg-green-50 border-green-300'
                        : 'bg-amber-50 border-amber-300'
                    }`}>
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                          allReady ? 'bg-green-200' : 'bg-amber-200'
                        }`}>
                          {allReady ? '\u2705' : '\uD83D\uDD12'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm ${allReady ? 'text-green-800' : 'text-amber-800'}`}>
                            {allReady
                              ? (isEn ? 'Your account is verified — you can publish jobs!' : 'Votre compte est verifie — vous pouvez publier des offres !')
                              : (isEn ? 'Complete your profile to publish jobs' : 'Completez votre profil pour publier des offres')}
                          </p>
                          <p className={`text-xs font-medium mt-1 ${allReady ? 'text-green-600' : 'text-amber-700'}`}>
                            {allReady
                              ? (isEn ? 'All requirements have been met.' : 'Toutes les conditions sont remplies.')
                              : (isEn ? 'Logo + NIU/RCCM document are required before posting.' : 'Le logo + document NIU/RCCM sont requis avant de publier.')}
                          </p>
                          {/* Checklist */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                            <span className={`text-xs font-semibold flex items-center gap-1 ${hasLogo ? 'text-green-700' : 'text-gray-400'}`}>
                              {hasLogo ? '\u2713' : '\u25CB'} {isEn ? 'Company logo' : 'Logo entreprise'}
                            </span>
                            <span className={`text-xs font-semibold flex items-center gap-1 ${hasDoc ? 'text-green-700' : 'text-gray-400'}`}>
                              {hasDoc ? '\u2713' : '\u25CB'} {isEn ? 'NIU/RCCM document' : 'Document NIU/RCCM'}
                            </span>
                            <span className={`text-xs font-semibold flex items-center gap-1 ${isApproved ? 'text-green-700' : 'text-gray-400'}`}>
                              {isApproved ? '\u2713' : '\u25CB'} {isEn ? 'Documents approved' : 'Documents approuves'}
                            </span>
                          </div>
                          {!allReady && (
                            <button
                              onClick={() => navigateTo('post')}
                              className="mt-3 inline-flex items-center gap-1.5 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-700 transition-all active:scale-[0.98]"
                            >
                              {isEn ? 'Complete verification' : 'Completer la verification'} &rarr;
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Stats cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Active jobs */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                    <p className="text-blue-100 text-[11px] sm:text-xs font-bold uppercase tracking-wide">{isEn ? 'Active Jobs' : 'Offres actives'}</p>
                    <p className="text-2xl sm:text-3xl font-extrabold mt-2">{String(publishedJobs.filter(j => j.status === 'approved').length).padStart(2, '0')}</p>
                    <p className="text-blue-200 text-[11px] font-medium mt-1">{isEn ? 'Published' : 'Publiees'}</p>
                  </div>

                  {/* Pending */}
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                    <p className="text-amber-100 text-[11px] sm:text-xs font-bold uppercase tracking-wide">{isEn ? 'Pending' : 'En attente'}</p>
                    <p className="text-2xl sm:text-3xl font-extrabold mt-2">{String(publishedJobs.filter(j => j.status === 'pending').length).padStart(2, '0')}</p>
                    <p className="text-amber-200 text-[11px] font-medium mt-1">{isEn ? 'Under review' : 'En moderation'}</p>
                  </div>

                  {/* Applications */}
                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                    <p className="text-emerald-100 text-[11px] sm:text-xs font-bold uppercase tracking-wide">{isEn ? 'Applications' : 'Candidatures'}</p>
                    <p className="text-2xl sm:text-3xl font-extrabold mt-2">{String(unreadNotifications).padStart(2, '0')}</p>
                    <p className="text-emerald-200 text-[11px] font-medium mt-1">{isEn ? 'To review' : 'A examiner'}</p>
                  </div>

                  {/* Views */}
                  <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                    <p className="text-purple-100 text-[11px] sm:text-xs font-bold uppercase tracking-wide">{isEn ? 'Total Views' : 'Vues totales'}</p>
                    <p className="text-2xl sm:text-3xl font-extrabold mt-2">00</p>
                    <p className="text-purple-200 text-[11px] font-medium mt-1">{isEn ? 'This month' : 'Ce mois'}</p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => navigateTo('post')}
                    disabled={!(companyLogoFile && companyDocFile && documentsVerificationStatus === 'approved')}
                    className={`group rounded-2xl p-6 text-center transition-all ${
                      companyLogoFile && companyDocFile && documentsVerificationStatus === 'approved'
                        ? 'bg-white border-2 border-dashed border-green-300 hover:border-green-500 hover:shadow-lg cursor-pointer'
                        : 'bg-gray-50 border-2 border-dashed border-gray-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition text-2xl ${
                      companyLogoFile && companyDocFile && documentsVerificationStatus === 'approved'
                        ? 'bg-green-50 group-hover:bg-green-100'
                        : 'bg-gray-100'
                    }`}>
                      {companyLogoFile && companyDocFile && documentsVerificationStatus === 'approved' ? '\u{1F4DD}' : '\uD83D\uDD12'}
                    </div>
                    <p className={`font-bold text-[15px] ${
                      companyLogoFile && companyDocFile && documentsVerificationStatus === 'approved' ? 'text-gray-900' : 'text-gray-400'
                    }`}>{isEn ? 'Post a New Job' : 'Publier une nouvelle offre'}</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      {companyLogoFile && companyDocFile && documentsVerificationStatus === 'approved'
                        ? (isEn ? 'Free during launch' : 'Gratuit pendant le lancement')
                        : (isEn ? 'Complete verification first' : 'Completez la verification d\'abord')}
                    </p>
                  </button>

                  <button
                    onClick={() => navigateTo('listings')}
                    className="group bg-white border border-gray-200 hover:border-gray-300 rounded-2xl p-6 text-center transition-all hover:shadow-lg"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mx-auto mb-3 transition text-2xl">
                      {'\u{1F4CB}'}
                    </div>
                    <p className="font-bold text-gray-900 text-[15px]">{isEn ? 'View My Listings' : 'Voir mes annonces'}</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">{jobsPublishedCount} {isEn ? 'total posted' : 'publiees au total'}</p>
                  </button>
                </div>

                {/* Recent jobs list */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 text-[15px]">{isEn ? 'Recent Listings' : 'Annonces recentes'}</h3>
                    {publishedJobs.length > 0 && (
                      <button
                        onClick={() => navigateTo('listings')}
                        className="text-green-600 font-bold text-xs hover:underline"
                      >
                        {isEn ? 'View all' : 'Voir tout'}
                      </button>
                    )}
                  </div>

                  {publishedJobs.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center">
                      <div className="text-4xl sm:text-5xl mb-4">{'\u{1F4BC}'}</div>
                      <h4 className="font-bold text-gray-900 text-[15px] mb-2">
                        {isEn ? 'No job listings yet' : 'Aucune annonce pour le moment'}
                      </h4>
                      <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto">
                        {isEn
                          ? 'Post your first job to start receiving applications from qualified candidates.'
                          : 'Publiez votre premiere offre pour commencer a recevoir des candidatures.'}
                      </p>
                      <button
                        onClick={() => navigateTo('post')}
                        className="mt-5 bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-green-700 transition-all hover:shadow-lg active:scale-[0.98]"
                      >
                        {isEn ? 'Post your first job' : 'Publier ma premiere offre'}
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {publishedJobs.slice(0, 5).map(job => (
                        <div key={job.id} className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-gray-50/50 transition">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{job.title}</p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">{job.contract} &middot; {job.date}</p>
                          </div>
                          {statusBadge(job.status)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ POST A JOB VIEW - MULTI-STEP WIZARD ═══ */}
            {activeSection === 'post' && (
              <div className="space-y-6">
                {/* Wizard progress bar */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-extrabold text-gray-900">{isEn ? 'Post a Job' : 'Publier une offre'}</h2>
                    <span className="text-xs font-bold text-gray-400">
                      {isEn ? 'Step' : 'Etape'} {wizardStep}/3
                    </span>
                  </div>

                  {/* Step indicators */}
                  <div className="flex items-center gap-2 mb-8">
                    {[1, 2, 3].map(step => (
                      <div key={step} className="flex-1 flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                          step < wizardStep
                            ? 'bg-green-600 text-white'
                            : step === wizardStep
                              ? 'bg-green-600 text-white ring-4 ring-green-100'
                              : 'bg-gray-100 text-gray-400'
                        }`}>
                          {step < wizardStep ? '\u2713' : step}
                        </div>
                        {step < 3 && (
                          <div className={`flex-1 h-1 rounded-full transition-all ${step < wizardStep ? 'bg-green-500' : 'bg-gray-100'}`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step labels */}
                  <div className="grid grid-cols-3 gap-2 mb-8">
                    <p className={`text-[11px] sm:text-xs font-bold text-center ${wizardStep >= 1 ? 'text-green-700' : 'text-gray-400'}`}>
                      {isEn ? 'Verify Phone' : 'Verification'}
                    </p>
                    <p className={`text-[11px] sm:text-xs font-bold text-center ${wizardStep >= 2 ? 'text-green-700' : 'text-gray-400'}`}>
                      {isEn ? 'Job Details' : 'Details offre'}
                    </p>
                    <p className={`text-[11px] sm:text-xs font-bold text-center ${wizardStep >= 3 ? 'text-green-700' : 'text-gray-400'}`}>
                      {isEn ? 'Review & Post' : 'Relecture'}
                    </p>
                  </div>

                  {/* ── STEP 1: OTP Verification ── */}
                  {wizardStep === 1 && (
                    <div className="space-y-5">
                      <div className={`rounded-2xl p-5 sm:p-6 border-2 transition-all ${
                        otpVerified
                          ? 'bg-green-50 border-green-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                            otpVerified ? 'bg-green-200' : 'bg-amber-200'
                          }`}>
                            {otpVerified ? '\u2705' : '\u{1F4F1}'}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${otpVerified ? 'text-green-800' : 'text-amber-800'}`}>
                              {otpVerified
                                ? (isEn ? 'Phone Verified!' : 'Telephone verifie!')
                                : (isEn ? 'Phone Verification Required' : 'Verification telephone requise')}
                            </p>
                            <p className={`text-xs font-medium mt-0.5 ${otpVerified ? 'text-green-600' : 'text-amber-700'}`}>
                              {isEn
                                ? 'OTP verification is mandatory before posting any job.'
                                : 'La verification OTP est obligatoire avant toute publication.'}
                            </p>
                          </div>
                        </div>

                        {!otpVerified && (
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+237 6XX XX XX XX"
                                className="flex-1 p-3 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                              />
                              <button
                                onClick={sendOtp}
                                className="px-6 py-3 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-black transition shrink-0 active:scale-[0.98]"
                              >
                                {isEn ? 'Send OTP' : 'Envoyer OTP'}
                              </button>
                            </div>

                            {otpSent && (
                              <div className="space-y-3 pt-2">
                                <p className="text-[11px] font-bold text-gray-500">
                                  {isEn ? 'Demo code:' : 'Code demo:'} {otpCode}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    value={otpInput}
                                    onChange={(e) => setOtpInput(e.target.value)}
                                    placeholder="000000"
                                    className="flex-1 p-3 border border-gray-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none tracking-widest text-center font-bold text-lg"
                                    maxLength={6}
                                  />
                                  <button
                                    onClick={verifyOtp}
                                    className="px-6 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition shrink-0 active:scale-[0.98]"
                                  >
                                    {isEn ? 'Verify' : 'Verifier'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className={`rounded-2xl p-5 sm:p-6 border-2 transition-all ${
                        documentsVerificationStatus === 'approved' ? 'bg-green-50 border-green-200' : documentsVerificationStatus === 'pending' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${documentsVerificationStatus === 'approved' ? 'bg-green-200' : documentsVerificationStatus === 'pending' ? 'bg-blue-200' : 'bg-amber-200'}`}>
                            {documentsVerificationStatus === 'approved' ? '\u2705' : documentsVerificationStatus === 'pending' ? '\u{23F3}' : '\u{1F4C4}'}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${documentsVerificationStatus === 'approved' ? 'text-green-800' : documentsVerificationStatus === 'pending' ? 'text-blue-800' : 'text-amber-800'}`}>
                              {documentsVerificationStatus === 'approved'
                                ? (isEn ? 'Approved by Super Admin' : 'Approuve par le Super Admin')
                                : documentsVerificationStatus === 'pending'
                                  ? (isEn ? 'Pending Super Admin review' : 'En attente de validation Super Admin')
                                  : (isEn ? 'Logo + Legal documents required' : 'Logo + documents legaux requis')}
                            </p>
                            <p className={`text-xs font-medium mt-0.5 ${documentsVerificationStatus === 'approved' ? 'text-green-600' : documentsVerificationStatus === 'pending' ? 'text-blue-700' : 'text-amber-700'}`}>
                              {isEn
                                ? 'Upload your logo and NIU/RCCM proof, then submit to Super Admin for validation before posting.'
                                : 'Telechargez votre logo et un justificatif NIU/RCCM, puis soumettez au Super Admin avant publication.'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                              {isEn ? 'Company logo' : 'Logo entreprise'}
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                setCompanyLogoFile(e.target.files?.[0] ?? null);
                                if (documentsVerificationStatus === 'approved') {
                                  setDocumentsVerificationStatus('not_submitted');
                                }
                              }}
                              className="w-full p-2.5 border border-gray-300 rounded-xl text-sm bg-white"
                            />
                            {companyLogoFile && <p className="mt-1 text-[11px] font-medium text-gray-500">{companyLogoFile.name}</p>}
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                              {isEn ? 'NIU/RCCM proof document' : 'Justificatif NIU/RCCM'}
                            </label>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                setCompanyDocFile(e.target.files?.[0] ?? null);
                                if (documentsVerificationStatus === 'approved') {
                                  setDocumentsVerificationStatus('not_submitted');
                                }
                              }}
                              className="w-full p-2.5 border border-gray-300 rounded-xl text-sm bg-white"
                            />
                            {companyDocFile && <p className="mt-1 text-[11px] font-medium text-gray-500">{companyDocFile.name}</p>}
                          </div>

                          <button
                            onClick={verifyCompanyDocuments}
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-black transition"
                          >
                            {isEn ? 'Submit to Super Admin' : 'Soumettre au Super Admin'}
                          </button>
                        </div>
                      </div>

                      {/* Message display */}
                      {publishMessage && (
                        <div className={`rounded-xl p-4 text-sm font-bold ${
                          publishMessageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                          publishMessageType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {publishMessage}
                        </div>
                      )}

                      <button
                        onClick={() => {
                          if (otpVerified && documentsVerificationStatus === 'approved') {
                            setPublishMessage('');
                            setWizardStep(2);
                          } else {
                            setPublishMessage(
                              isEn
                                ? 'Complete phone verification and get Super Admin approval for your documents before continuing.'
                                : 'Completez la verification telephone et obtenez la validation Super Admin de vos documents avant de continuer.'
                            );
                            setPublishMessageType('error');
                          }
                        }}
                        disabled={!isEnterprisePublishingReady}
                        className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${
                          isEnterprisePublishingReady
                            ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl active:scale-[0.99]'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isEn ? 'Continue to Job Details' : 'Continuer vers les details'} {'\u2192'}
                      </button>
                    </div>
                  )}

                  {/* ── STEP 2: Job Details ── */}
                  {wizardStep === 2 && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                            {isEn ? 'Job Title' : 'Intitule du poste'} *
                          </label>
                          <input
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder={isEn ? 'e.g. Senior Accountant' : 'ex: Comptable Senior'}
                            className="w-full p-3.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50/50 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                            {isEn ? 'Contract Type' : 'Type de contrat'}
                          </label>
                          <select
                            value={jobContract}
                            onChange={(e) => setJobContract(e.target.value)}
                            className="w-full p-3.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50/50 text-sm cursor-pointer"
                          >
                            <option value="CDI">CDI</option>
                            <option value="CDD">CDD</option>
                            <option value="Stage">Stage</option>
                            <option value="Freelance">Freelance</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                            {isEn ? 'Location' : 'Lieu'}
                          </label>
                          <input
                            type="text"
                            value={jobLocation}
                            onChange={(e) => setJobLocation(e.target.value)}
                            placeholder={isEn ? 'e.g. Douala, Cameroon' : 'ex: Douala, Cameroun'}
                            className="w-full p-3.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50/50 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                            {isEn ? 'Salary (optional)' : 'Salaire (optionnel)'}
                          </label>
                          <input
                            type="text"
                            value={jobSalary}
                            onChange={(e) => setJobSalary(e.target.value)}
                            placeholder={isEn ? 'e.g. 250,000 - 400,000 FCFA' : 'ex: 250 000 - 400 000 FCFA'}
                            className="w-full p-3.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50/50 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                          {isEn ? 'Job Description' : 'Description des missions'} *
                        </label>
                        <textarea
                          value={jobDescription}
                          onChange={(e) => setJobDescription(e.target.value)}
                          placeholder={isEn ? 'Describe the responsibilities, requirements, and qualifications...' : 'Decrivez les responsabilites, exigences et qualifications...'}
                          className="w-full h-40 sm:h-48 p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50/50 resize-none text-sm"
                        />
                      </div>

                      {/* Anti-fraud notice */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
                        <span className="text-xl shrink-0">{'\u{1F6E1}'}</span>
                        <div className="text-xs text-gray-600 font-medium">
                          <p className="font-bold text-gray-800 mb-1">{isEn ? 'Anti-Fraud Filter Active' : 'Filtre anti-fraude actif'}</p>
                          <p>
                            {isEn
                              ? 'Posts containing "frais de dossier", "transfert mobile money", or "investissement" will be automatically blocked. The first 3 publications go through admin review (quarantine).'
                              : 'Les offres contenant "frais de dossier", "transfert mobile money", ou "investissement" sont automatiquement bloquees. Les 3 premieres publications passent en moderation admin (quarantaine).'}
                          </p>
                        </div>
                      </div>

                      {publishMessage && (
                        <div className={`rounded-xl p-4 text-sm font-bold ${
                          publishMessageType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {publishMessage}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => { setWizardStep(1); setPublishMessage(''); }}
                          className="sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition order-2 sm:order-1"
                        >
                          {'\u2190'} {isEn ? 'Back' : 'Retour'}
                        </button>
                        <button
                          onClick={() => {
                            if (!jobTitle.trim() || !jobDescription.trim()) {
                              setPublishMessage(isEn ? 'Fill in title and description first.' : 'Renseignez d\'abord le titre et la description.');
                              setPublishMessageType('error');
                              return;
                            }
                            const blocked = containsBlockedKeyword(`${jobTitle} ${jobDescription}`);
                            if (blocked) {
                              setPublishMessage(`${isEn ? 'Blocked by anti-fraud filter:' : 'Bloque par le filtre anti-fraude:'} "${blocked}"`);
                              setPublishMessageType('error');
                              return;
                            }
                            setPublishMessage('');
                            setWizardStep(3);
                          }}
                          className="flex-1 py-3.5 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition shadow-lg hover:shadow-xl active:scale-[0.99] order-1 sm:order-2"
                        >
                          {isEn ? 'Continue to Review' : 'Continuer vers la relecture'} {'\u2192'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: Review & Publish ── */}
                  {wizardStep === 3 && (
                    <div className="space-y-5">
                      {/* Summary card */}
                      <div className="rounded-2xl border border-gray-200 bg-gray-50/50 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-white">
                          <p className="font-bold text-gray-900 text-sm">{isEn ? 'Review your job post' : 'Relecture de votre offre'}</p>
                        </div>
                        <div className="p-5 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">{isEn ? 'Job Title' : 'Poste'}</p>
                              <p className="font-bold text-gray-900 text-sm">{jobTitle || '-'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">{isEn ? 'Contract' : 'Contrat'}</p>
                              <p className="font-bold text-gray-900 text-sm">{jobContract}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">{isEn ? 'Location' : 'Lieu'}</p>
                              <p className="font-bold text-gray-900 text-sm">{jobLocation || (isEn ? 'Not specified' : 'Non specifie')}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">{isEn ? 'Salary' : 'Salaire'}</p>
                              <p className="font-bold text-gray-900 text-sm">{jobSalary || (isEn ? 'Not specified' : 'Non specifie')}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">{isEn ? 'Description' : 'Description'}</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{jobDescription}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">{isEn ? 'Phone' : 'Telephone'}</p>
                            <p className="font-bold text-green-600 text-sm flex items-center gap-1.5">
                              {'\u2705'} {phone}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Moderation notice */}
                      {jobsPublishedCount < 3 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                          <span className="text-xl shrink-0">{'\u{23F3}'}</span>
                          <div className="text-xs text-amber-800 font-medium">
                            <p className="font-bold mb-0.5">{isEn ? 'Moderation Notice' : 'Avis de moderation'}</p>
                            <p>
                              {isEn
                                ? `This is publication ${jobsPublishedCount + 1}/3. Your first 3 posts are reviewed by an admin before going live.`
                                : `Ceci est la publication ${jobsPublishedCount + 1}/3. Vos 3 premieres offres sont validees par un admin avant mise en ligne.`}
                            </p>
                          </div>
                        </div>
                      )}

                      {publishMessage && (
                        <div className={`rounded-xl p-4 text-sm font-bold ${
                          publishMessageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                          publishMessageType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {publishMessage}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => { setWizardStep(2); setPublishMessage(''); }}
                          className="sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition order-2 sm:order-1"
                        >
                          {'\u2190'} {isEn ? 'Edit' : 'Modifier'}
                        </button>
                        <button
                          onClick={publishJob}
                          disabled={isPublishing}
                          className={`flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-base hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl active:scale-[0.99] order-1 sm:order-2 ${isPublishing ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {isPublishing
                            ? (isEn ? 'Publishing...' : 'Publication en cours...')
                            : `\u{1F680} ${isEn ? 'Publish this job for free' : 'Publier l\'annonce gratuitement'}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═══ LISTINGS VIEW ═══ */}
            {activeSection === 'listings' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="text-lg font-extrabold text-gray-900">{isEn ? 'My Job Listings' : 'Mes annonces'}</h2>
                  <button
                    onClick={() => navigateTo('post')}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition active:scale-[0.98] self-start"
                  >
                    + {isEn ? 'New Job' : 'Nouvelle offre'}
                  </button>
                </div>

                {publishedJobs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center">
                    <div className="text-5xl mb-4">{'\u{1F4CB}'}</div>
                    <h4 className="font-bold text-gray-900 mb-2">{isEn ? 'No listings yet' : 'Aucune annonce'}</h4>
                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto">
                      {isEn ? 'Your job listings will appear here.' : 'Vos annonces apparaitront ici.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publishedJobs.map(job => (
                      <div key={job.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-md transition">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center text-lg shrink-0">
                          {'\u{1F4BC}'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{job.title}</p>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">{job.contract} &middot; {job.date}</p>
                        </div>
                        <div className="flex items-center gap-3 self-start sm:self-center">
                          {statusBadge(job.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ PROFILE / VERIFICATION VIEW ═══ */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-lg font-extrabold text-gray-900">{isEn ? 'Company Profile' : 'Profil Entreprise'}</h2>

                {/* Verification section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <span className="text-xl">{'\u{1F6E1}'}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{isEn ? 'Identity Shield' : 'Bouclier Identite'}</p>
                      <p className="text-xs text-gray-500">{isEn ? 'Verify your company to unlock unlimited posting' : 'Verifiez votre entreprise pour debloquer la publication illimitee'}</p>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className={`rounded-xl p-4 border-2 ${isRecruiterVerified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isRecruiterVerified ? 'bg-green-500' : 'bg-amber-500'}`} />
                        <p className={`text-sm font-bold ${isRecruiterVerified ? 'text-green-800' : 'text-amber-800'}`}>
                          {isRecruiterVerified
                            ? (isEn ? 'Verified Recruiter' : 'Recruteur Verifie')
                            : (isEn ? 'Unverified - Limited to 3 posts' : 'Non verifie - Limite a 3 publications')}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">
                        {isEn
                          ? 'Enter your NIU or RCCM number (5+ characters) to unlock unlimited job posting.'
                          : 'Entrez votre NIU ou RCCM (5+ caracteres) pour debloquer la publication illimitee.'}
                      </p>
                    </div>

                    <div className={`rounded-xl p-4 border-2 ${documentsVerificationStatus === 'approved' ? 'bg-green-50 border-green-200' : documentsVerificationStatus === 'pending' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${documentsVerificationStatus === 'approved' ? 'bg-green-500' : documentsVerificationStatus === 'pending' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                        <p className={`text-sm font-bold ${documentsVerificationStatus === 'approved' ? 'text-green-800' : documentsVerificationStatus === 'pending' ? 'text-blue-800' : 'text-amber-800'}`}>
                          {documentsVerificationStatus === 'approved'
                            ? (isEn ? 'Documents approved by Super Admin' : 'Documents approuves par Super Admin')
                            : documentsVerificationStatus === 'pending'
                              ? (isEn ? 'Documents pending Super Admin review' : 'Documents en attente Super Admin')
                              : (isEn ? 'Documents & logo not submitted' : 'Documents et logo non soumis')}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">
                        {isEn
                          ? 'A company cannot publish any job before Super Admin validates logo and legal documents.'
                          : 'Une entreprise ne peut pas publier d offre tant que le Super Admin n a pas valide le logo et les documents legaux.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">NIU</label>
                        <input
                          type="text"
                          value={niu}
                          onChange={(e) => setNiu(e.target.value)}
                          placeholder={isEn ? 'Tax identification number' : 'Numero d\'identification fiscale'}
                          className="w-full p-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">RCCM</label>
                        <input
                          type="text"
                          value={rccm}
                          onChange={(e) => setRccm(e.target.value)}
                          placeholder={isEn ? 'Trade register number' : 'Registre de commerce'}
                          className="w-full p-3.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ PLACEHOLDER VIEWS ═══ */}
            {activeSection === 'applications' && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-[15px]">{isEn ? 'Applications Inbox' : 'Boite de candidatures'}</h3>
                  <span className="text-xs font-bold text-gray-500">
                    {isEn ? `${notifications.length} notifications` : `${notifications.length} notifications`}
                  </span>
                </div>

                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="text-4xl mb-3">{'\u{1F514}'}</div>
                    <p className="text-sm text-gray-500 font-medium">
                      {isEn ? 'No new applications yet.' : 'Aucune nouvelle candidature pour le moment.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((n) => (
                      <div key={n.id} className={`px-5 sm:px-6 py-4 ${n.isRead ? 'bg-white' : 'bg-emerald-50/60'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-gray-900">{n.title}</p>
                            <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(n.createdAt).toLocaleString(isEn ? 'en-US' : 'fr-FR')}
                            </p>
                          </div>
                          {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-2" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(activeSection === 'interviews' || activeSection === 'cvtheque' || activeSection === 'billing') && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-16 text-center">
                <div className="text-5xl mb-4">
                  {activeSection === 'interviews' && '\u{1F4C5}'}
                  {activeSection === 'cvtheque' && '\u{1F4DA}'}
                  {activeSection === 'billing' && '\u{1F4B3}'}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">
                  {isEn ? 'Coming Soon' : 'Bientot disponible'}
                </h3>
                <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto">
                  {isEn
                    ? 'This feature is under development. Post jobs to start receiving applications!'
                    : 'Cette fonctionnalite est en cours de developpement. Publiez des offres pour commencer a recevoir des candidatures!'}
                </p>
                <button
                  onClick={() => navigateTo('post')}
                  className="mt-5 bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-green-700 transition active:scale-[0.98]"
                >
                  {isEn ? 'Post a Job' : 'Publier une offre'}
                </button>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ═══════════════════════════════════════
          MOBILE BOTTOM NAV (visible < lg only)
          ═══════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {[
            { key: 'dashboard' as SidebarSection, icon: '\u{1F3E0}', label: isEn ? 'Home' : 'Accueil' },
            { key: 'post' as SidebarSection, icon: '\u{2795}', label: isEn ? 'Post' : 'Publier' },
            { key: 'listings' as SidebarSection, icon: '\u{1F4CB}', label: isEn ? 'Jobs' : 'Offres' },
            { key: 'applications' as SidebarSection, icon: '\u{1F465}', label: isEn ? 'Inbox' : 'Boite' },
            { key: 'profile' as SidebarSection, icon: '\u{1F3E2}', label: isEn ? 'Profile' : 'Profil' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => navigateTo(item.key)}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                activeSection === item.key ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px] font-bold">{item.label}</span>
              {activeSection === item.key && (
                <span className="w-1 h-1 rounded-full bg-green-600 mt-0.5" />
              )}
              {item.key === 'applications' && unreadNotifications > 0 && (
                <span className="absolute ml-6 -mt-6 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden lg:block">
        <Footer />
      </div>

      {/* ═══ Global styles ═══ */}
      <style jsx global>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
