"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { getModerationStatusForFirstPublications } from '@/lib/trustShield';
import {
  addArtisanService,
  addPortfolioImage,
  createJob,
  fetchArtisanPortfolio,
  fetchArtisanServices,
  fetchArtisanDashboardOverview,
  fetchSessionUser,
  fetchUserProfile,
  logoutUser,
  upsertUserProfile,
  uploadFile,
  type ApiJob,
  type ArtisanPortfolioItem,
  type ArtisanService,
  type ArtisanClickHistoryPoint,
  fetchVerificationStatus,
  createVerificationSubmission,
  removeArtisanService,
  removePortfolioImage,
  ApiError,
  type Pagination,
  type UserProfile,
  type VerificationStatus,
} from '@/lib/api';
import { fileToImageDataUrl } from '@/lib/filePreview';
import { clearStoredSession, hasRecentAuthSuccess, mergeStoredUser } from '@/lib/session';

type AdDraft = {
  title: string;
  description: string;
  location: string;
  contract?: string;
  salary?: string;
};

type ArtisanServiceView = {
  id?: number;
  name: string;
  desc: string;
  price: string;
};

type PortfolioImageView = {
  id?: number;
  url: string;
  name: string;
};

type PendingDeleteTarget = {
  kind: 'portfolio' | 'service';
  index: number;
  label: string;
};

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
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
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
            ? 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-md shadow-amber-200'
            : 'bg-gray-100 text-gray-400 border border-gray-200'}
        `}
      >
        {done ? '\u2713' : ''}
      </span>
      <span className={`text-sm font-semibold transition-colors ${done ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

function createEmptyUserProfileDraft(initial: Partial<Omit<UserProfile, 'userId' | 'updatedAt'>> = {}): Omit<UserProfile, 'userId' | 'updatedAt'> {
  return {
    fullName: '',
    title: '',
    location: '',
    availability: '',
    profileVisible: true,
    jobAlertRole: '',
    jobAlertCity: '',
    phone: '',
    email: '',
    profile: '',
    experience: '',
    education: '',
    skillsText: '',
    languagesText: '',
    ...initial,
  };
}

function buildEmptyClickHistory(days = 7): ArtisanClickHistoryPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, index) => {
    const current = new Date(today);
    current.setDate(today.getDate() - (days - 1 - index));
    return {
      dayKey: current.toISOString().slice(0, 10),
      count: 0,
    };
  });
}

function MiniHistoryChart({ points, isEn }: { points: ArtisanClickHistoryPoint[]; isEn: boolean }) {
  const series = points.length ? points : buildEmptyClickHistory();
  const maxValue = Math.max(1, ...series.map((point) => point.count));

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        {series.map((point) => {
          const height = Math.max(10, Math.round((point.count / maxValue) * 72));
          const label = new Date(`${point.dayKey}T00:00:00`).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { weekday: 'short' });

          return (
            <div key={point.dayKey} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-gray-500">{point.count}</span>
              <div className="flex h-20 w-full items-end justify-center rounded-2xl bg-gray-50 px-1.5 pb-1.5">
                <div
                  className="w-full rounded-xl bg-gradient-to-t from-emerald-500 to-green-300 shadow-sm transition-all"
                  style={{ height: `${height}px` }}
                  title={`${point.count} ${isEn ? 'clicks' : 'clics'}`}
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">{label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs font-medium leading-relaxed text-gray-500">
        {isEn
          ? 'This mini history shows the last 7 days of WhatsApp intent generated by your profile.'
          : 'Ce mini historique montre les 7 derniers jours d intention WhatsApp generes par votre profil.'}
      </p>
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
  const [accessStatus, setAccessStatus] = useState<'checking' | 'allowed' | 'unavailable'>('checking');
  const [accessError, setAccessError] = useState('');
  const [accessRetryToken, setAccessRetryToken] = useState(0);
  const [userName, setUserName] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('bolo237-user');
      if (!raw) return '';
      const u = JSON.parse(raw);
      return u.name || u.fullName || '';
    } catch {
      return '';
    }
  });
  const [userSpecialty, setUserSpecialty] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('bolo237-user');
      if (!raw) return '';
      const u = JSON.parse(raw);
      return u.specialty || u.metier || '';
    } catch {
      return '';
    }
  });
  const [userId, setUserId] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem('bolo237-user');
      if (!raw) return 0;
      const u = JSON.parse(raw);
      return Number(u.id || 0);
    } catch {
      return 0;
    }
  });
  const [userLocation, setUserLocation] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('bolo237-user');
      if (!raw) return '';
      const u = JSON.parse(raw);
      return u.location || u.city || u.localisation || '';
    } catch {
      return '';
    }
  });

  /* ---------- state ---------- */
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'services' | 'annonces'>('portfolio');
  const [mobileTab, setMobileTab] = useState<'home' | 'portfolio' | 'services' | 'annonces' | 'account'>('home');
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isVerifiedFromBackend, setIsVerifiedFromBackend] = useState(false);
  const [servicesPostedCount, setServicesPostedCount] = useState(0);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  const [whatsAppConnected, setWhatsAppConnected] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loadingMyAds, setLoadingMyAds] = useState(false);
  const [myAds, setMyAds] = useState<ApiJob[]>([]);
  const [contactClicks, setContactClicks] = useState(0);
  const [clickHistory, setClickHistory] = useState<ArtisanClickHistoryPoint[]>([]);
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adLocation, setAdLocation] = useState('');
  const [adSalary, setAdSalary] = useState('');
  const [isOptimizingAd, setIsOptimizingAd] = useState(false);
  const [adAiDraft, setAdAiDraft] = useState<AdDraft | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('not_submitted');

  /* service form */
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [services, setServices] = useState<ArtisanServiceView[]>([]);
  const [profileDraft, setProfileDraft] = useState<Omit<UserProfile, 'userId' | 'updatedAt'>>(() => createEmptyUserProfileDraft({
    fullName: userName || '',
    title: userSpecialty || '',
    location: userLocation || '',
  }));
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveMessage, setProfileSaveMessage] = useState('');

  /* portfolio */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioImageView[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [portfolioPage, setPortfolioPage] = useState(1);
  const [portfolioPagination, setPortfolioPagination] = useState<Pagination | null>(null);
  const [isLoadingMorePortfolio, setIsLoadingMorePortfolio] = useState(false);
  const [uploadingPortfolioNames, setUploadingPortfolioNames] = useState<string[]>([]);
  const [deletingPortfolioId, setDeletingPortfolioId] = useState<number | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(null);
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState<PendingDeleteTarget | null>(null);
  const [isDeleteDialogBusy, setIsDeleteDialogBusy] = useState(false);

  const portfolioLimit = 9;

  const isArtisanVerified = isVerifiedFromBackend || verificationStatus === 'approved';
  const accountKey = (userName || 'artisan').toLowerCase();
  const verificationSteps = [!!profilePhotoPreview];
  const completedSteps = verificationSteps.filter(Boolean).length;
  const visibilityScore = Math.round(((completedSteps * 10) + (services.length > 0 ? 15 : 0) + (portfolioImages.length > 0 ? 15 : 0) + (userName ? 10 : 0) + 20) / 100 * 100);
  const profileCompletionScore = Math.round(([
    !!profilePhotoPreview,
    !!userSpecialty,
    services.length > 0,
    portfolioImages.length > 0,
    isArtisanVerified,
  ].filter(Boolean).length / 5) * 100);
  const completionLabel = profileCompletionScore >= 80
    ? (isEn ? 'Profile ready to convert' : 'Profil pret a convertir')
    : profileCompletionScore >= 50
      ? (isEn ? 'Good momentum, keep polishing' : 'Bonne dynamique, continuez a peaufiner')
      : (isEn ? 'Complete your profile to win more trust' : 'Completez votre profil pour gagner plus de confiance');
  const artisanName = userName || (isEn ? 'Artisan' : 'Artisan');
  const artisanSpecialty = userSpecialty;
  const artisanLocation = userLocation || (isEn ? 'Cameroon' : 'Cameroun');
  const portfolioCount = portfolioImages.length;
  const servicesCount = services.length;
  const isVerified = isArtisanVerified;
  const liveAdsCount = myAds.filter((ad) => ad.status === 'APPROVED' || ad.status === 'ACTIVE').length;
  const pendingAdsCount = myAds.filter((ad) => ad.status === 'PENDING').length;
  const artisanWarmFieldCls = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-base sm:text-sm appearance-none transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20';
  const artisanWarmTextareaCls = `${artisanWarmFieldCls} resize-none`;
  const artisanEmeraldFieldCls = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-base sm:text-sm appearance-none transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';
  const artisanEmeraldTextareaCls = `${artisanEmeraldFieldCls} resize-none`;
  const artisanCompactFieldCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base sm:text-sm appearance-none';
  const artisanCompactTextareaCls = `${artisanCompactFieldCls} resize-none`;

  const loadMyAds = useCallback(async () => {
    if (accessStatus !== 'allowed' || !userId) return;
    setLoadingMyAds(true);
    try {
      const data = await fetchArtisanDashboardOverview();
      setMyAds(data.jobs);
      setServicesPostedCount(data.jobs.length);
      setContactClicks(data.profileViews);
      setClickHistory(data.clickHistory || []);
    } catch {
      // Keep dashboard usable if backend is temporarily unavailable.
    } finally {
      setLoadingMyAds(false);
    }
  }, [accessStatus, userId]);

  useEffect(() => {
    if (accessStatus !== 'allowed' || !userId) return;

    let active = true;

    const loadEditableProfile = async () => {
      try {
        const [profile, servicesRows, portfolioPageData] = await Promise.all([
          fetchUserProfile(userId),
          fetchArtisanServices(userId).catch(() => [] as ArtisanService[]),
          fetchArtisanPortfolio(userId, { page: 1, limit: portfolioLimit }).catch(() => ({
            items: [] as ArtisanPortfolioItem[],
            pagination: { page: 1, limit: portfolioLimit, total: 0, totalPages: 1 },
          })),
        ]);
        if (!active) return;

        setProfileDraft(createEmptyUserProfileDraft(profile));
        setServices(
          servicesRows.map((service) => ({
            id: service.id,
            name: service.name,
            desc: service.description || '',
            price: service.price || '',
          }))
        );
        setPortfolioImages(
          portfolioPageData.items.map((item) => ({
            id: item.id,
            url: item.imageUrl,
            name: item.title || item.imageUrl.split('/').pop() || 'Portfolio',
          }))
        );
        setPortfolioPage(1);
        setPortfolioPagination(portfolioPageData.pagination);

        if (profile.title) {
          setUserSpecialty(profile.title);
        }
        if (profile.location) {
          setUserLocation(profile.location);
        }

        mergeStoredUser({
          specialty: profile.title,
          metier: profile.title,
          location: profile.location,
          fullName: profile.fullName || userName,
          name: profile.fullName || userName,
        });
      } catch (error) {
        if (!active) return;

        if (error instanceof ApiError && error.status === 404) {
          setProfileDraft((current) => createEmptyUserProfileDraft({
            ...current,
            fullName: current.fullName || userName || '',
            title: current.title || userSpecialty || '',
            location: current.location || userLocation || '',
          }));
          const [servicesRows, portfolioPageData] = await Promise.all([
            fetchArtisanServices(userId).catch(() => [] as ArtisanService[]),
            fetchArtisanPortfolio(userId, { page: 1, limit: portfolioLimit }).catch(() => ({
              items: [] as ArtisanPortfolioItem[],
              pagination: { page: 1, limit: portfolioLimit, total: 0, totalPages: 1 },
            })),
          ]);
          if (!active) return;
          setServices(
            servicesRows.map((service) => ({
              id: service.id,
              name: service.name,
              desc: service.description || '',
              price: service.price || '',
            }))
          );
          setPortfolioImages(
            portfolioPageData.items.map((item) => ({
              id: item.id,
              url: item.imageUrl,
              name: item.title || item.imageUrl.split('/').pop() || 'Portfolio',
            }))
          );
          setPortfolioPage(1);
          setPortfolioPagination(portfolioPageData.pagination);
          return;
        }
      }
    };

    loadEditableProfile();

    return () => {
      active = false;
    };
  }, [accessStatus, userId, userLocation, userName, userSpecialty]);

  useEffect(() => {
    if (accessStatus !== 'allowed') return;
    loadMyAds();
  }, [accessStatus, loadMyAds]);

  useEffect(() => {
    try {
      const linked = localStorage.getItem('bolo237-whatsapp-linked') === 'true';
      setWhatsAppConnected(linked);
    } catch {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    let active = true;

    const applyUser = (user: Record<string, unknown>) => {
      setUserName(String(user.name || user.fullName || ''));
      setUserSpecialty(String(user.specialty || user.metier || ''));
      setUserId(Number(user.id || 0));
      setUserLocation(String(user.location || user.city || user.localisation || ''));
      setIsVerifiedFromBackend(Boolean(user.isVerified));
      setProfilePhotoPreview(String(user.photoUrl || '') || null);
    };

    const getStoredArtisanUser = (): Record<string, unknown> | null => {
      try {
        const raw = localStorage.getItem('bolo237-user');
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const storedRole = String(parsed.role || localStorage.getItem('bolo237-account-role') || '').toLowerCase();
        if (storedRole !== 'artisan') return null;
        return parsed;
      } catch {
        return null;
      }
    };

    const redirectToArtisanLogin = async () => {
      await logoutUser().catch(() => undefined);
      clearStoredSession();
      window.location.href = `${localizePath('/connexion')}?role=artisan`;
    };

    const ensureArtisanAccess = async () => {
      const storedUser = getStoredArtisanUser();
      if (storedUser) {
        applyUser(storedUser);
      }

      const recentAuth = hasRecentAuthSuccess();
      const maxAttempts = recentAuth ? 4 : 2;
      let sawAuthFailure = false;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
        } else {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        try {
          const sessionUser = await fetchSessionUser({ captureServerErrors: false });
          if (!active) return;

          const sessionRole = String(sessionUser.role || '').toUpperCase();
          if (sessionRole === 'CANDIDAT') {
            mergeStoredUser(sessionUser as unknown as Record<string, unknown>);
            window.location.href = localizePath('/dashboard');
            return;
          }
          if (sessionRole === 'ENTREPRISE') {
            mergeStoredUser(sessionUser as unknown as Record<string, unknown>);
            window.location.href = localizePath('/dashboard-entreprise');
            return;
          }
          if (sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN') {
            mergeStoredUser(sessionUser as unknown as Record<string, unknown>);
            window.location.href = 'https://admin.bolo237.com';
            return;
          }
          if (sessionRole !== 'ARTISAN') {
            await redirectToArtisanLogin();
            return;
          }

          mergeStoredUser(sessionUser as unknown as Record<string, unknown>);
          applyUser(sessionUser as unknown as Record<string, unknown>);
          setAccessError('');
          setAccessStatus('allowed');
          return;
        } catch (err) {
          const status = err instanceof ApiError ? err.status : 0;
          if (status === 401 || status === 403) {
            sawAuthFailure = true;
            continue;
          }

          if (!active) return;

          if (storedUser) {
            setAccessError('');
            setAccessStatus('allowed');
            return;
          }

          setAccessError(
            isEn
              ? 'We cannot confirm your artisan session right now. Please try again in a moment.'
              : 'Nous ne pouvons pas verifier votre session artisan pour le moment. Reessayez dans un instant.'
          );
          setAccessStatus('unavailable');
          return;
        }
      }

      if (!active) return;

      if (storedUser) {
        setAccessError('');
        setAccessStatus('allowed');
        return;
      }

      if (sawAuthFailure) {
        await redirectToArtisanLogin();
        return;
      }

      await redirectToArtisanLogin();
    };

    ensureArtisanAccess();

    return () => {
      active = false;
    };
  }, [accessRetryToken, isEn, localizePath]);

  useEffect(() => {
    if (accessStatus !== 'allowed') {
      setVerificationStatus('not_submitted');
      return;
    }
    const loadVerificationStatus = async () => {
      if (!accountKey) {
        setVerificationStatus('not_submitted');
        return;
      }
      try {
        const status = await fetchVerificationStatus('artisan', accountKey);
        setVerificationStatus(status);
        if (status === 'approved') {
          setIsVerifiedFromBackend(true);
          mergeStoredUser({ isVerified: true });
        }
      } catch {
        setVerificationStatus('not_submitted');
      }
    };

    loadVerificationStatus();
  }, [accessStatus, accountKey]);

  const connectWhatsApp = () => {
    const intro = isEn
      ? `Hello Bolo237, this is ${userName || 'an artisan'} and I want to connect my WhatsApp account.`
      : `Bonjour Bolo237, je suis ${userName || 'un artisan'} et je veux connecter mon compte WhatsApp.`;
    const targetUrl = `https://wa.me/?text=${encodeURIComponent(intro)}`;

    try {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      localStorage.setItem('bolo237-whatsapp-linked', 'true');
      setWhatsAppConnected(true);
      setWhatsAppMessage(
        isEn
          ? 'WhatsApp opened. Complete the chat to finalize the connection.'
          : 'WhatsApp ouvert. Finalisez la conversation pour terminer la connexion.'
      );
    } catch {
      setWhatsAppMessage(
        isEn
          ? 'Unable to open WhatsApp on this device.'
          : 'Impossible d ouvrir WhatsApp sur cet appareil.'
      );
    }
  };

  const handleProfilePhotoUpload = async (file: File | null) => {
    setProfilePhotoFile(file);
    if (!file) {
      setProfilePhotoPreview(null);
      mergeStoredUser({ photoUrl: '' });
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const uploaded = await uploadFile(file, 'artisan-photos');
      setProfilePhotoPreview(uploaded.url);
      mergeStoredUser({ photoUrl: uploaded.url });
      setVerificationMessage(isEn ? 'Profile photo uploaded.' : 'Photo de profil telechargee.');
    } catch {
      const localPreview = await fileToImageDataUrl(file);
      setProfilePhotoPreview(localPreview);
      setVerificationMessage(
        isEn
          ? 'Photo preview saved locally. Upload service unavailable for now.'
          : 'Apercu enregistre localement. Service upload indisponible pour le moment.'
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const publishServiceNeed = async () => {
    if (!userId) {
      setVerificationMessage(isEn ? 'Session not found. Please sign in again.' : 'Session introuvable. Veuillez vous reconnecter.');
      return;
    }

    if (!adTitle.trim() || !adDescription.trim()) {
      setVerificationMessage(
        isEn
          ? 'Please add a title and description before publishing.'
          : 'Ajoutez un titre et une description avant de publier.'
      );
      return;
    }

    setIsPublishing(true);

    try {
      const created = await createJob({
        title: adTitle.trim(),
        company: userName || 'Artisan',
        location: adLocation.trim() || 'Cameroun',
        description: adDescription.trim(),
        salary: adSalary.trim() || undefined,
        authorId: userId,
      });

      const next = servicesPostedCount + 1;
      setServicesPostedCount(next);
      setMyAds((prev) => [created, ...prev]);

      const status = getModerationStatusForFirstPublications(servicesPostedCount);
      setVerificationMessage(
        status === 'en-attente'
          ? isEn
            ? `Published successfully (${next}/3). Status: pending admin review.`
            : `Publication reussie (${next}/3). Statut: en attente de validation admin.`
          : isEn
            ? 'Published successfully and visible.'
            : 'Publication reussie et visible.'
      );

      setAdTitle('');
      setAdDescription('');
      setAdLocation('');
      setAdSalary('');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVerificationMessage(isEn ? `Publish failed: ${message}` : `Echec de publication: ${message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const optimizeAdWithAi = async () => {
    if (!adTitle.trim() || !adDescription.trim()) {
      setVerificationMessage(
        isEn
          ? 'Please add a title and description before optimization.'
          : 'Ajoutez un titre et une description avant optimisation.'
      );
      return;
    }

    setIsOptimizingAd(true);
    setVerificationMessage(isEn ? 'AI is optimizing your ad...' : 'L IA optimise votre annonce...');

    try {
      const response = await fetch('/api/ai/job-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: isEn ? 'EN' : 'FR',
          role: 'artisan',
          specialty: userSpecialty,
          companyName: userName,
          jobData: {
            title: adTitle,
            description: adDescription,
            location: adLocation,
            salary: adSalary,
          },
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        optimized?: AdDraft;
      };

      if (!response.ok || !payload.success || !payload.optimized) {
        throw new Error(payload.message || 'AI optimization failed');
      }

      setAdAiDraft(payload.optimized);
      setVerificationMessage(isEn ? 'AI draft ready. Review before apply.' : 'Brouillon IA pret. Relisez avant application.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVerificationMessage(isEn ? `AI optimization failed: ${message}` : `Echec optimisation IA: ${message}`);
    } finally {
      setIsOptimizingAd(false);
    }
  };

  const applyAiAdDraft = () => {
    if (!adAiDraft) return;
    setAdTitle(adAiDraft.title || '');
    setAdDescription(adAiDraft.description || '');
    setAdLocation(adAiDraft.location || '');
    setAdSalary(adAiDraft.salary || '');
    setAdAiDraft(null);
    setVerificationMessage(isEn ? 'AI draft applied. You can still edit.' : 'Brouillon IA applique. Vous pouvez encore modifier.');
  };

  /* portfolio file handler (upload + persistence) */
  const handleFiles = async (files: FileList | null) => {
    if (!files || !userId) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      if (file.size > 5 * 1024 * 1024) {
        setVerificationMessage(
          isEn
            ? `Image ${file.name} exceeds 5MB and was skipped.`
            : `L image ${file.name} depasse 5 Mo et a ete ignoree.`
        );
        continue;
      }

      setUploadingPortfolioNames((prev) => [...prev, file.name]);
      try {
        const uploaded = await uploadFile(file, 'artisan-portfolio');
        const saved = await addPortfolioImage(userId, {
          imageUrl: uploaded.url,
          title: file.name,
        });

        setPortfolioImages((prev) => [
          {
            id: saved.id,
            url: saved.imageUrl,
            name: saved.title || file.name,
          },
          ...prev,
        ]);
        setPortfolioPagination((prev) => {
          if (!prev) return prev;
          return { ...prev, total: prev.total + 1 };
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setVerificationMessage(
          isEn
            ? `Portfolio upload failed for ${file.name}: ${message}`
            : `Echec de l upload portfolio pour ${file.name} : ${message}`
        );
      } finally {
        setUploadingPortfolioNames((prev) => prev.filter((name) => name !== file.name));
      }
    }
  };

  const loadMorePortfolio = async () => {
    if (!userId || isLoadingMorePortfolio) return;
    if (!portfolioPagination || portfolioPage >= portfolioPagination.totalPages) return;

    const nextPage = portfolioPage + 1;
    setIsLoadingMorePortfolio(true);
    try {
      const next = await fetchArtisanPortfolio(userId, { page: nextPage, limit: portfolioLimit });
      setPortfolioImages((prev) => [
        ...prev,
        ...next.items.map((item) => ({
          id: item.id,
          url: item.imageUrl,
          name: item.title || item.imageUrl.split('/').pop() || 'Portfolio',
        })),
      ]);
      setPortfolioPage(nextPage);
      setPortfolioPagination(next.pagination);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVerificationMessage(
        isEn
          ? `Unable to load more portfolio images: ${message}`
          : `Impossible de charger plus d images portfolio : ${message}`
      );
    } finally {
      setIsLoadingMorePortfolio(false);
    }
  };

  const deletePortfolioEntry = async (index: number) => {
    const target = portfolioImages[index];
    if (!target) return;

    if (!target.id) {
      setPortfolioImages((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }

    if (!userId) return;
    setDeletingPortfolioId(target.id);
    try {
      await removePortfolioImage(userId, target.id);
      setPortfolioImages((prev) => prev.filter((item) => item.id !== target.id));
      setPortfolioPagination((prev) => {
        if (!prev) return prev;
        return { ...prev, total: Math.max(0, prev.total - 1) };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVerificationMessage(
        isEn
          ? `Unable to delete portfolio image: ${message}`
          : `Impossible de supprimer l image portfolio : ${message}`
      );
    } finally {
      setDeletingPortfolioId(null);
    }
  };

  /* add service (DB persistence) */
  const addService = async () => {
    if (!serviceName.trim() || !userId) return;

    try {
      const saved = await addArtisanService(userId, {
        name: serviceName.trim(),
        description: serviceDesc.trim(),
        price: servicePrice.trim(),
      });

      setServices((prev) => [
        {
          id: saved.id,
          name: saved.name,
          desc: saved.description || '',
          price: saved.price || '',
        },
        ...prev,
      ]);
      setServiceName('');
      setServiceDesc('');
      setServicePrice('');
      setShowServiceForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVerificationMessage(
        isEn
          ? `Service save failed: ${message}`
          : `Echec lors de l enregistrement du service : ${message}`
      );
    }
  };

  const deleteService = async (index: number) => {
    const target = services[index];
    if (!target) return;

    if (!target.id) {
      setServices((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }

    if (!userId) return;
    setDeletingServiceId(target.id);
    try {
      await removeArtisanService(userId, target.id);
      setServices((prev) => prev.filter((item) => item.id !== target.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setVerificationMessage(
        isEn
          ? `Unable to delete service: ${message}`
          : `Impossible de supprimer le service : ${message}`
      );
    } finally {
      setDeletingServiceId(null);
    }
  };

  const requestDeletePortfolio = (index: number) => {
    const target = portfolioImages[index];
    if (!target) return;
    setPendingDeleteTarget({
      kind: 'portfolio',
      index,
      label: target.name || (isEn ? 'this photo' : 'cette photo'),
    });
  };

  const requestDeleteService = (index: number) => {
    const target = services[index];
    if (!target) return;
    setPendingDeleteTarget({
      kind: 'service',
      index,
      label: target.name || (isEn ? 'this service' : 'ce service'),
    });
  };

  const confirmDeleteTarget = async () => {
    if (!pendingDeleteTarget) return;
    setIsDeleteDialogBusy(true);

    try {
      if (pendingDeleteTarget.kind === 'portfolio') {
        await deletePortfolioEntry(pendingDeleteTarget.index);
      } else {
        await deleteService(pendingDeleteTarget.index);
      }
    } finally {
      setIsDeleteDialogBusy(false);
      setPendingDeleteTarget(null);
    }
  };

  const submitToSuperAdmin = async () => {
    if (!isArtisanVerified) {
      setVerificationMessage(
        isEn
          ? 'Please upload your profile photo first.'
          : 'Veuillez d abord telecharger votre photo de profil.'
      );
      return;
    }

    const profilePhotoPreview = await fileToImageDataUrl(profilePhotoFile);

    await createVerificationSubmission({
      role: 'artisan',
      accountKey,
      displayName: userName || 'Artisan',
      phone: '',
      payload: {
        userId,
        hasProfilePhoto: !!profilePhotoFile,
        profilePhotoName: profilePhotoFile?.name ?? null,
        profilePhotoPreview,
      },
    });

    setVerificationStatus('pending');

    setVerificationMessage(
      isEn
        ? 'Verification request submitted. Waiting for Super Admin review.'
        : 'Demande de verification soumise. En attente du Super Admin.'
    );
  };

  const saveArtisanProfile = async () => {
    if (!userId) {
      setProfileSaveMessage(isEn ? 'Session not found. Please sign in again.' : 'Session introuvable. Veuillez vous reconnecter.');
      return;
    }

    if (!profileDraft.title.trim() || !profileDraft.location.trim()) {
      setProfileSaveMessage(
        isEn
          ? 'Please fill in your specialty and your location first.'
          : 'Veuillez d abord renseigner votre specialite et votre localisation.'
      );
      return;
    }

    setIsSavingProfile(true);
    setProfileSaveMessage('');

    try {
      const payload = createEmptyUserProfileDraft({
        ...profileDraft,
        fullName: profileDraft.fullName.trim() || userName || 'Artisan',
        title: profileDraft.title.trim(),
        location: profileDraft.location.trim(),
        phone: profileDraft.phone.trim(),
        email: profileDraft.email.trim(),
        profile: profileDraft.profile.trim(),
        experience: profileDraft.experience.trim(),
        education: profileDraft.education.trim(),
        skillsText: profileDraft.skillsText.trim(),
        languagesText: profileDraft.languagesText.trim(),
      });

      const saved = await upsertUserProfile(userId, payload);

      setProfileDraft(createEmptyUserProfileDraft(saved));
      setUserName(saved.fullName || userName);
      setUserSpecialty(saved.title);
      setUserLocation(saved.location);
      mergeStoredUser({
        fullName: saved.fullName || userName,
        name: saved.fullName || userName,
        specialty: saved.title,
        metier: saved.title,
        location: saved.location,
      });
      setProfileSaveMessage(isEn ? 'Profile updated successfully.' : 'Profil mis a jour avec succes.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setProfileSaveMessage(isEn ? `Profile update failed: ${message}` : `Echec de mise a jour du profil: ${message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Sync mobile tab -> desktop tab                                   */
  /* ---------------------------------------------------------------- */
  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  if (accessStatus === 'unavailable') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl text-amber-700">
            !
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-gray-900">
            {isEn ? 'Session service temporarily unavailable' : 'Service de session temporairement indisponible'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {accessError || (isEn ? 'Please retry in a few moments.' : 'Reessayez dans quelques instants.')}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                setAccessError('');
                setAccessStatus('checking');
                setAccessRetryToken((value) => value + 1);
              }}
              className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-amber-600"
            >
              {isEn ? 'Retry access check' : 'Relancer la verification'}
            </button>
            <Link
              href={`${localizePath('/connexion')}?role=artisan`}
              className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-extrabold text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
            >
              {isEn ? 'Go to artisan sign in' : 'Aller a la connexion artisan'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (accessStatus !== 'allowed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-amber-500 animate-spin" />
          <p className="text-sm font-semibold text-gray-600">
            {isEn ? 'Checking your artisan access...' : 'Verification de votre acces artisan...'}
          </p>
        </div>
      </div>
    );
  }

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
            <Image src="/logo.svg" alt="Bolo237" width={120} height={32} className="h-8 w-auto" />
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
                  <button
                    onClick={() => {
                      logoutUser().catch(() => undefined);
                      clearStoredSession();
                      window.location.href = localizePath('/');
                    }}
                    className="w-full text-left px-5 py-2.5 hover:bg-red-50 hover:text-red-600 transition font-medium text-sm flex items-center gap-2 rounded-lg mx-1"
                  >
                    <span>&#10140;</span> {isEn ? 'Logout' : 'Deconnexion'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/*  PREMIUM ARTISAN HEADER                                       */}
      {/* ============================================================ */}
      <section className="w-full border-b border-gray-200 bg-[#fafaf8]">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="relative mb-8 flex flex-col items-center gap-8 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:flex-row lg:items-start">
            <div className="relative flex-shrink-0">
              <label className="group relative flex h-32 w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-50 shadow-xl ring-1 ring-gray-200 transition-all hover:bg-gray-100 hover:ring-amber-500 sm:h-40 sm:w-40">
                {profilePhotoPreview ? (
                  <Image src={profilePhotoPreview} alt="Profil" width={160} height={160} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-gray-400 transition-colors group-hover:text-amber-600">
                    <span className="text-5xl sm:text-6xl">🧑‍🔧</span>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  onChange={(e) => handleProfilePhotoUpload(e.target.files?.[0] ?? null)}
                />

                <div className="absolute inset-0 hidden flex-col items-center justify-center bg-black/60 text-xs font-bold text-white backdrop-blur-sm transition-all group-hover:flex">
                  <span>📸</span>
                  <span>{isEn ? 'Update' : 'Modifier'}</span>
                </div>
              </label>
              {isVerified ? (
                <div
                  className="absolute right-4 top-4 rounded-full border-2 border-white bg-green-500 p-1.5 text-white shadow-sm lg:-right-2 lg:top-8"
                  title={isEn ? 'Verified profile' : 'Profil Verifie'}
                >
                  ✓
                </div>
              ) : null}
            </div>

            <div className="flex w-full flex-1 flex-col justify-center text-center lg:text-left">
              <div className="mb-6">
                <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                  {isEn ? 'Welcome back' : 'Bon retour'}, {artisanName} 👋
                </h1>
                <p className="mt-1.5 flex items-center justify-center gap-2 text-sm font-medium text-gray-500 sm:text-base lg:justify-start">
                  <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    {artisanSpecialty || (isEn ? 'Specialty missing' : 'Specialite a configurer')}
                  </span>
                  <span>•</span>
                  <span>📍 {artisanLocation}</span>
                </p>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory custom-scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
                <div className="min-w-[80%] flex-shrink-0 snap-center flex items-center gap-4 rounded-xl border border-green-100 bg-green-50/50 p-4 transition hover:bg-green-50 sm:min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl shadow-sm">
                    💬
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-black leading-none text-green-700">{contactClicks || 0}</p>
                    <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wider text-green-600">
                      {isEn ? 'WhatsApp clicks' : 'Clics WhatsApp'}
                    </p>
                  </div>
                </div>

                <div className="min-w-[80%] flex-shrink-0 snap-center flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 transition hover:bg-blue-50 sm:min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl shadow-sm">
                    🖼️
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-black leading-none text-blue-700">{portfolioCount || 0}</p>
                    <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wider text-blue-600">
                      {isEn ? 'Gallery photos' : 'Photos galerie'}
                    </p>
                  </div>
                </div>

                <div className="min-w-[80%] flex-shrink-0 snap-center flex items-center gap-4 rounded-xl border border-purple-100 bg-purple-50/50 p-4 transition hover:bg-purple-50 sm:min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-2xl shadow-sm">
                    🛠️
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-black leading-none text-purple-700">{servicesCount || 0}</p>
                    <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wider text-purple-600">
                      {isEn ? 'Services listed' : 'Services affiches'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
          <div className="relative overflow-hidden rounded-[28px] border border-amber-100 bg-gradient-to-br from-white via-amber-50/70 to-orange-50 p-6 shadow-sm">
            <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-amber-200/25" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                {isEn ? 'Visibility' : 'Visibilite'}
              </span>
              <h3 className="mt-4 text-sm font-black text-gray-900">
                {isEn ? 'Your profile attracts trust' : 'Votre profil inspire confiance'}
              </h3>
              <p className="mb-5 mt-2 text-xs font-medium leading-relaxed text-gray-500">
                {isEn ? 'Complete the visible elements clients look for first: photo, services, and project proof.' : 'Completez les elements visibles que les clients regardent d abord : photo, services et preuves de chantier.'}
              </p>
              <CircularProgress value={Math.min(visibilityScore, 100)} />
              <p className="mt-4 text-xs font-semibold text-gray-600">
                {visibilityScore >= 80
                  ? (isEn ? 'Great visibility!' : 'Excellente visibilite !')
                  : (isEn ? 'Keep improving your profile' : 'Continuez a ameliorer votre profil')}
              </p>
              <div className="mt-4 grid w-full grid-cols-2 gap-2 text-left">
                <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">{isEn ? 'Photo' : 'Photo'}</p>
                  <p className="mt-1 text-sm font-extrabold text-gray-900">{profilePhotoPreview ? '100%' : '0%'}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/80 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">{isEn ? 'Portfolio' : 'Portfolio'}</p>
                  <p className="mt-1 text-sm font-extrabold text-gray-900">{portfolioCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  {isEn ? 'WhatsApp momentum' : 'Momentum WhatsApp'}
                </p>
                <h3 className="mt-2 text-sm font-black text-gray-900">
                  {isEn ? 'Recent contact history' : 'Historique recent des contacts'}
                </h3>
              </div>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                {contactClicks} {isEn ? 'total' : 'total'}
              </span>
            </div>
            <MiniHistoryChart points={clickHistory} isEn={isEn} />
          </div>

          {/* Identity Shield */}
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm anim-fadeUp-d1">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-black text-gray-900">
                &#128737; {isEn ? 'Identity Shield' : 'Bouclier Identite'}
              </h3>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${isArtisanVerified ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                {verificationStatus === 'approved' ? (isEn ? 'APPROVED' : 'APPROUVE') : verificationStatus === 'pending' ? (isEn ? 'PENDING' : 'EN ATTENTE') : `${completedSteps}/1`}
              </span>
            </div>

            <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                {isEn ? 'Trust signal' : 'Signal de confiance'}
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-900">
                {isEn ? 'A verified profile with a strong photo gets more replies and more serious WhatsApp conversations.' : 'Un profil verifie avec une belle photo obtient plus de reponses et des conversations WhatsApp plus serieuses.'}
              </p>
            </div>

            {/* Visual checklist */}
            <div className="mb-5 space-y-3">
              <StepCheck done={true} label={isEn ? 'Phone verified at signup' : 'Telephone verifie a l inscription'} />
              <StepCheck done={!!profilePhotoPreview} label={isEn ? 'Profile photo uploaded' : 'Photo de profil fournie'} />
            </div>

            {/* Toggle verification form */}
            <button
              onClick={() => setShowVerification(!showVerification)}
              className={`
                w-full py-2.5 rounded-xl text-sm font-bold transition
                ${showVerification
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-gray-900 text-white hover:bg-black shadow-md shadow-gray-200'}
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
                    ? 'Upload your profile photo to complete your verification. Your phone was already verified during signup.'
                    : 'Telechargez votre photo de profil pour completer votre verification. Votre telephone a deja ete verifie lors de l inscription.'}
                </p>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-4 tracking-wider">
                    {isEn ? 'Profile Photo' : 'Photo de profil'}
                  </label>

                  <div className="flex flex-col items-center gap-6 sm:flex-row">
                    <label className="group relative flex h-32 w-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-50 shadow-lg ring-1 ring-gray-200 transition-all hover:bg-gray-100 hover:ring-amber-500">
                      {profilePhotoPreview ? (
                        <Image src={profilePhotoPreview} alt="Profil" width={128} height={128} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-gray-400 transition-colors group-hover:text-amber-600">
                          <span className="text-4xl">🧑‍🔧</span>
                        </div>
                      )}

                      <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        className="hidden"
                        onChange={(e) => handleProfilePhotoUpload(e.target.files?.[0] ?? null)}
                      />

                      <div className="absolute inset-0 hidden items-center justify-center bg-black/50 text-xs font-bold text-white backdrop-blur-sm transition-all group-hover:flex">
                        {isEn ? 'Update' : 'Modifier'}
                      </div>
                    </label>

                    <div className="flex-1 text-center sm:text-left">
                      <p className="mb-1 text-sm font-bold text-gray-900">
                        {isEn ? 'Show your face to clients' : 'Montrez votre visage aux clients'}
                      </p>
                      <p className="text-xs font-medium leading-relaxed text-gray-500">
                        {isEn
                          ? 'Artisans with a clear profile photo receive up to 3 times more calls. Format: JPG, PNG. Max size: 5MB.'
                          : 'Les artisans avec une photo de profil claire recoivent jusqu a 3 fois plus d appels. Format: JPG, PNG. Max: 5 Mo.'}
                      </p>
                      {profilePhotoFile ? (
                        <p className="mt-3 inline-block rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700">
                          ✓ {profilePhotoFile.name}
                        </p>
                      ) : null}
                      {isUploadingPhoto ? (
                        <p className="mt-3 text-[11px] font-bold text-amber-700">
                          {isEn ? 'Uploading...' : 'Telechargement en cours...'}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <button
                  onClick={submitToSuperAdmin}
                  className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-black transition"
                >
                  {isEn ? 'Submit' : 'Soumettre'}
                </button>

                {verificationMessage && (
                  <div className={`text-xs font-bold px-3 py-2 rounded-lg ${verificationMessage.includes('verifie') || verificationMessage.includes('verified') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {verificationMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  {isEn ? 'Profile workshop' : 'Atelier profil'}
                </p>
                <h3 className="mt-2 text-sm font-black text-gray-900">
                  {isEn ? 'Edit your positioning' : 'Editez votre positionnement'}
                </h3>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                {profileCompletionScore}%
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  {isEn ? 'Specialty' : 'Specialite'}
                </label>
                <input
                  value={profileDraft.title}
                  onChange={(e) => setProfileDraft((current) => ({ ...current, title: e.target.value }))}
                  placeholder={isEn ? 'Example: Electrician, Mason, Carpenter' : 'Exemple : Electricien, Macon, Menuisier'}
                  className={artisanWarmFieldCls}
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  {isEn ? 'Location' : 'Localisation'}
                </label>
                <input
                  value={profileDraft.location}
                  onChange={(e) => setProfileDraft((current) => ({ ...current, location: e.target.value }))}
                  placeholder={isEn ? 'Example: Douala, Yaounde, Bafoussam' : 'Exemple : Douala, Yaounde, Bafoussam'}
                  className={artisanWarmFieldCls}
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  {isEn ? 'Short pitch' : 'Presentation courte'}
                </label>
                <textarea
                  value={profileDraft.profile}
                  onChange={(e) => setProfileDraft((current) => ({ ...current, profile: e.target.value }))}
                  rows={3}
                  placeholder={isEn ? 'Explain in one sentence why a client should contact you.' : 'Expliquez en une phrase pourquoi un client doit vous contacter.'}
                  className={artisanWarmTextareaCls}
                />
              </div>

              <button
                onClick={saveArtisanProfile}
                disabled={isSavingProfile}
                className="w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
              >
                {isSavingProfile
                  ? (isEn ? 'Saving...' : 'Enregistrement...')
                  : (isEn ? 'Save profile essentials' : 'Enregistrer les elements du profil')}
              </button>

              {profileSaveMessage ? (
                <div className={`rounded-xl px-3 py-2 text-xs font-bold ${profileSaveMessage.includes('succes') || profileSaveMessage.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {profileSaveMessage}
                </div>
              ) : null}
            </div>
          </div>

          {/* WhatsApp - mobile only */}
          <div className="sm:hidden">
            <button
              onClick={connectWhatsApp}
              className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-green-200/40 flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {whatsAppConnected
                ? (isEn ? 'WhatsApp Connected' : 'WhatsApp Connecte')
                : (isEn ? 'Connect WhatsApp' : 'Connecter WhatsApp')}
            </button>
            {whatsAppMessage && (
              <p className="mt-2 text-xs text-emerald-800 font-semibold">{whatsAppMessage}</p>
            )}
          </div>
        </aside>

        {/* ---------------------------------------------------------- */}
        {/*  RIGHT CONTENT AREA                                         */}
        {/* ---------------------------------------------------------- */}
        <section className="flex-1 space-y-6 min-w-0">

          {/* TABS (desktop/tablet) */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar-hide border-b border-gray-200 pb-2 anim-fadeUp-d1 md:grid md:grid-cols-3 md:gap-1 md:rounded-[24px] md:border md:bg-white md:p-1.5 md:shadow-sm md:overflow-visible md:pb-0">
            {([
              { key: 'portfolio' as const, icon: '\uD83D\uDDBC\uFE0F', en: 'Portfolio', fr: 'Portfolio' },
              { key: 'services' as const, icon: '\uD83D\uDEE0\uFE0F', en: 'Services & Pricing', fr: 'Services & Tarifs' },
              { key: 'annonces' as const, icon: '\uD83D\uDCE2', en: 'Post a Need', fr: 'Publier un besoin' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  shrink-0 whitespace-nowrap px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 md:w-full
                  ${activeTab === tab.key
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-gray-900 shadow-sm border border-amber-100'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}
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
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {isEn ? 'Profile completion' : 'Completion du profil'}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {isEn
                        ? 'A 100% profile generates up to 3x more WhatsApp contacts.'
                        : 'Un profil a 100% genere jusqu a 3x plus de contacts WhatsApp.'}
                    </p>
                  </div>
                  <span className="text-2xl font-black text-blue-600">{profileCompletionScore}%</span>
                </div>

                <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-2.5 rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${profileCompletionScore}%` }}
                  />
                </div>

                <p className="mb-4 text-xs font-semibold text-gray-600">
                  {completionLabel}
                </p>

                <div className="flex flex-wrap gap-4 text-xs font-bold">
                  <span className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${profilePhotoPreview ? 'bg-green-50 text-green-600' : 'border border-gray-100 bg-gray-50 text-gray-500'}`}>
                    {profilePhotoPreview ? '✓' : '○'} {isEn ? 'Photo added' : 'Photo ajoutee'}
                  </span>
                  <span className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${userSpecialty ? 'bg-green-50 text-green-600' : 'border border-gray-100 bg-gray-50 text-gray-500'}`}>
                    {userSpecialty ? '✓' : '○'} {isEn ? 'Specialty filled in' : 'Specialite a renseigner'}
                  </span>
                  <span className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${services.length > 0 ? 'bg-green-50 text-green-600' : 'border border-gray-100 bg-gray-50 text-gray-500'}`}>
                    {services.length > 0 ? '✓' : '○'} {isEn ? 'At least one service' : 'Ajouter un service'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {isEn ? `Your work (${portfolioImages.length})` : `📸 Vos realisations (${portfolioImages.length})`}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {isEn
                        ? 'Add photos of your jobs to reassure clients.'
                        : 'Ajoutez des photos de vos chantiers pour rassurer les clients.'}
                    </p>
                  </div>
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition cursor-pointer flex flex-col items-center justify-center ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => { void handleFiles(e.target.files); }}
                    className="hidden"
                  />
                  <span className="mb-3 block text-4xl">📱</span>
                  <p className="sm:hidden mb-1 text-base font-bold text-gray-900">
                    {isEn ? 'Tap to add a photo' : 'Appuyez pour ajouter une photo'}
                  </p>
                  <p className="hidden sm:block text-sm font-bold text-gray-700">
                    {isEn ? 'Drop your photos here' : 'Glissez vos photos ici'}
                  </p>
                  <p className="mt-1 mb-4 text-xs text-gray-500">
                    {isEn ? 'From your gallery or camera' : 'Depuis votre galerie ou appareil photo'}
                  </p>
                  <button type="button" className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-black px-6 py-3.5 text-sm font-bold text-white shadow-sm">
                    <span>📸</span>
                    {isEn ? 'Open camera' : 'Ouvrir l appareil photo'}
                  </button>
                  {uploadingPortfolioNames.length > 0 ? (
                    <p className="mt-3 text-xs font-bold text-blue-600">
                      {isEn
                        ? `Uploading ${uploadingPortfolioNames.length} image(s)...`
                        : `Telechargement de ${uploadingPortfolioNames.length} image(s)...`}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6">
                  {portfolioImages.length === 0 ? (
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
                      <span className="mb-2 block text-2xl opacity-50">🖼️</span>
                      <p className="text-sm font-bold text-gray-500">
                        {isEn ? 'No photos yet.' : 'Aucune photo pour le moment.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {portfolioImages.map((img, i) => (
                        <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-100 shadow-sm transition-shadow hover:shadow-md">
                          <Image src={img.url} alt={img.name} fill unoptimized className="object-cover" />
                          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="truncate text-xs font-semibold text-white">{img.name}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDeletePortfolio(i);
                            }}
                            disabled={deletingPortfolioId === img.id}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-red-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-red-50 disabled:opacity-60"
                          >
                            {deletingPortfolioId === img.id ? '…' : '&#10005;'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {portfolioPagination && portfolioPage < portfolioPagination.totalPages ? (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => { void loadMorePortfolio(); }}
                        disabled={isLoadingMorePortfolio}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        {isLoadingMorePortfolio
                          ? (isEn ? 'Loading...' : 'Chargement...')
                          : (isEn ? 'Load more photos' : 'Charger plus de photos')}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/*  TAB: SERVICES                                            */}
          {/* ======================================================== */}
          {activeTab === 'services' && (
            <div className="space-y-6 anim-fadeUp-d2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {isEn ? 'Your services' : 'Vos services'}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {isEn
                        ? 'Clear services and visible prices help prospects decide faster.'
                        : 'Des services clairs et des prix visibles aident les prospects a se decider plus vite.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {services.length} {isEn ? 'listed' : 'affiches'}
                    </span>
                    {!showServiceForm ? (
                      <button
                        onClick={() => setShowServiceForm(true)}
                        className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black"
                      >
                        + {isEn ? 'Add a service' : 'Ajouter un service'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                {services.length === 0 ? (
                  <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-6 text-center">
                    <span className="mb-3 block text-3xl">🛠️</span>
                    <h4 className="text-sm font-bold text-gray-900">
                      {isEn ? 'No services yet' : 'Aucun service pour le moment'}
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      {isEn
                        ? 'Add your first offer to make your profile easier to understand.'
                        : 'Ajoutez votre premiere offre pour rendre votre profil plus facile a comprendre.'}
                    </p>
                  </div>
                ) : null}

                {services.length > 0 ? (
                  <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {services.map((service, index) => (
                      <div key={index} className="group relative rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-gray-200 hover:bg-white hover:shadow-sm">
                        <button
                          onClick={() => requestDeleteService(index)}
                          disabled={deletingServiceId === service.id}
                          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-red-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingServiceId === service.id ? '…' : '&#10005;'}
                        </button>
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg">
                          🛠️
                        </div>
                        <h4 className="pr-10 text-sm font-bold text-gray-900">{service.name}</h4>
                        {service.desc ? (
                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-gray-500">{service.desc}</p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-gray-600 ring-1 ring-gray-200">
                            {userSpecialty || (isEn ? 'General trade' : 'Metier general')}
                          </span>
                          {service.price ? (
                            <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                              {service.price} FCFA
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {showServiceForm ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3 anim-fadeUp">
                    <h4 className="text-sm font-bold text-gray-900">
                      {isEn ? 'New service' : 'Nouveau service'}
                    </h4>
                    <input
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder={isEn ? 'Service name (e.g. Plumbing repair)' : 'Nom du service (ex: Reparation plomberie)'}
                      className={artisanEmeraldFieldCls}
                    />
                    <textarea
                      value={serviceDesc}
                      onChange={(e) => setServiceDesc(e.target.value)}
                      placeholder={isEn ? 'Description (optional)' : 'Description (optionnel)'}
                      rows={2}
                      className={artisanEmeraldTextareaCls}
                    />
                    <input
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      placeholder={isEn ? 'Price in FCFA (e.g. 15000)' : 'Prix en FCFA (ex: 15000)'}
                      className={artisanEmeraldFieldCls}
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={addService}
                        className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white transition hover:bg-black"
                      >
                        {isEn ? 'Save service' : 'Enregistrer'}
                      </button>
                      <button
                        onClick={() => setShowServiceForm(false)}
                        className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-50"
                      >
                        {isEn ? 'Cancel' : 'Annuler'}
                      </button>
                    </div>
                  </div>
                ) : services.length > 0 ? (
                  <button
                    onClick={() => setShowServiceForm(true)}
                    className="w-full rounded-xl border border-dashed border-gray-300 bg-white py-4 text-sm font-bold text-gray-600 transition hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-emerald-700"
                  >
                    + {isEn ? 'Add another service' : 'Ajouter un autre service'}
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/*  TAB: ANNONCES                                            */}
          {/* ======================================================== */}
          {activeTab === 'annonces' && (
            <div className="space-y-6 anim-fadeUp-d2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {isEn ? 'Your announcements' : 'Vos annonces'}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {isEn
                        ? 'Publish a clear need and track what is already live or waiting for moderation.'
                        : 'Publiez un besoin clair et suivez ce qui est deja en ligne ou en attente de moderation.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {liveAdsCount} {isEn ? 'live' : 'en ligne'}
                    </span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                      {pendingAdsCount} {isEn ? 'pending' : 'en attente'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {isEn ? 'Publish a new need' : 'Publier un nouveau besoin'}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {isEn
                        ? 'Describe the help you need, let AI polish it if useful, then send it to moderation.'
                        : 'Decrivez le besoin, laissez l IA l ameliorer si utile, puis envoyez le tout en moderation.'}
                    </p>
                  </div>
                  <button
                    onClick={loadMyAds}
                    disabled={loadingMyAds}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                  >
                    {loadingMyAds ? (isEn ? 'Refreshing...' : 'Actualisation...') : (isEn ? 'Refresh ads' : 'Rafraichir')}
                  </button>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3">
                  <input
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder={isEn ? 'Ad title (required)' : 'Titre de l annonce (obligatoire)'}
                    className={artisanEmeraldFieldCls}
                  />
                  <textarea
                    value={adDescription}
                    onChange={(e) => setAdDescription(e.target.value)}
                    rows={3}
                    placeholder={isEn ? 'Ad description (required)' : 'Description de l annonce (obligatoire)'}
                    className={artisanEmeraldTextareaCls}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={adLocation}
                      onChange={(e) => setAdLocation(e.target.value)}
                      placeholder={isEn ? 'Location (e.g. Douala)' : 'Lieu (ex: Douala)'}
                      className={artisanEmeraldFieldCls}
                    />
                    <input
                      value={adSalary}
                      onChange={(e) => setAdSalary(e.target.value)}
                      placeholder={isEn ? 'Budget / salary (optional)' : 'Budget / salaire (optionnel)'}
                      className={artisanEmeraldFieldCls}
                    />
                  </div>
                  <div className="space-y-2 rounded-xl border border-purple-100 bg-purple-50/50 p-3">
                    <button
                      onClick={optimizeAdWithAi}
                      disabled={isOptimizingAd}
                      className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-60"
                    >
                      {isOptimizingAd
                        ? (isEn ? 'AI is optimizing...' : 'Optimisation IA...')
                        : `✨ ${isEn ? 'Optimize with AI' : 'Optimiser avec l IA'}`}
                    </button>

                    {isOptimizingAd && (
                      <div className="animate-pulse rounded-xl border border-purple-100 bg-white p-3">
                        <p className="text-xs font-bold text-purple-700">
                          {isEn ? 'AI analyzes your ad and improves wording...' : 'L IA analyse votre annonce et ameliore la formulation...'}
                        </p>
                      </div>
                    )}

                    {adAiDraft && (
                      <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
                          {isEn ? 'AI draft (editable)' : 'Brouillon IA (modifiable)'}
                        </p>
                        <input
                          value={adAiDraft.title}
                          onChange={(e) => setAdAiDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                          className={artisanCompactFieldCls}
                        />
                        <textarea
                          value={adAiDraft.description}
                          onChange={(e) => setAdAiDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                          rows={3}
                          className={artisanCompactTextareaCls}
                        />
                        <button
                          onClick={applyAiAdDraft}
                          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-700"
                        >
                          {isEn ? 'Apply this version' : 'Appliquer cette version'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={publishServiceNeed}
                      disabled={isPublishing}
                      className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
                    >
                      {isPublishing
                        ? (isEn ? 'Publishing...' : 'Publication...')
                        : (isEn ? 'Publish to backend' : 'Publier sur le backend')}
                    </button>
                    <Link
                      href={localizePath('/publier')}
                      onClick={() => {
                        if (!profilePhotoPreview) {
                          setVerificationMessage(
                            isEn
                              ? 'Tip: add a profile photo to increase trust and visibility.'
                              : 'Conseil: ajoutez une photo de profil pour renforcer la confiance et la visibilite.'
                          );
                        }
                      }}
                      className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-center text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                    >
                      + {isEn ? 'Open full publish page' : 'Ouvrir la page complete'}
                    </Link>
                  </div>
                  <p className="text-xs text-gray-400 font-medium">
                    {isEn ? 'All new ads are sent to admin moderation (Pending) before visibility.' : 'Toutes les nouvelles annonces passent en moderation admin (En attente) avant visibilite.'}
                  </p>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold text-gray-900">
                      {isEn ? 'Current ads' : 'Annonces actuelles'}
                    </h4>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-600">
                      {myAds.length} {isEn ? 'total' : 'total'}
                    </span>
                  </div>

                  {myAds.length === 0 ? (
                    <div className="py-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">&#128226;</span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1 text-sm">
                      {isEn ? 'No ads yet' : 'Aucune annonce pour le moment'}
                    </h4>
                    <p className="text-sm text-gray-500 font-medium">
                      {isEn ? 'Publish your first ad using the form above.' : 'Publiez votre premiere annonce avec le formulaire ci-dessus.'}
                    </p>
                    </div>
                  ) : (
                  <div className="space-y-3">
                    {myAds.map((ad) => (
                      <div key={ad.id} className="rounded-xl border border-gray-200 p-3 bg-gray-50/50">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-sm text-gray-900">{ad.title}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(ad.status === 'APPROVED' || ad.status === 'ACTIVE') ? 'bg-green-100 text-green-700' : ad.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {ad.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{ad.location} • {new Date(ad.createdAt).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}</p>
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                {verificationMessage && activeTab === 'annonces' && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold">
                    &#9888;&#65039; {verificationMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

      </main>

      {pendingDeleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-base font-extrabold text-gray-900">
              {isEn ? 'Confirm deletion' : 'Confirmer la suppression'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {pendingDeleteTarget.kind === 'portfolio'
                ? (isEn
                    ? `Delete photo "${pendingDeleteTarget.label}"? This action cannot be undone.`
                    : `Supprimer la photo "${pendingDeleteTarget.label}" ? Cette action est irreversible.`)
                : (isEn
                    ? `Delete service "${pendingDeleteTarget.label}"? This action cannot be undone.`
                    : `Supprimer le service "${pendingDeleteTarget.label}" ? Cette action est irreversible.`)}
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingDeleteTarget(null)}
                disabled={isDeleteDialogBusy}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>
              <button
                type="button"
                onClick={() => { void confirmDeleteTarget(); }}
                disabled={isDeleteDialogBusy}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleteDialogBusy ? (isEn ? 'Deleting...' : 'Suppression...') : (isEn ? 'Delete' : 'Supprimer')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                  if (item.key === 'portfolio' || item.key === 'services' || item.key === 'annonces') {
                    setActiveTab(item.key);
                  }
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
