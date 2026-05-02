"use client";

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { canPublishUnlimited, containsBlockedKeyword, getModerationStatusForFirstPublications } from '@/lib/trustShield';
import {
  createJob,
  updateJob,
  updateApplicationStatus,
  fetchEnterpriseDashboardOverview,
  fetchCandidateProfileDetail,
  fetchJobApplications,
  uploadFile,
  fetchSessionUser,
  fetchUserNotifications,
  logoutUser,
  markAllNotificationsAsRead,
  fetchVerificationStatus,
  createVerificationSubmission,
  ApiError,
  type ApiApplication,
  type ApiNotification,
  type ApiJob,
  type VerificationStatus,
} from '@/lib/api';
import { fileToImageDataUrl } from '@/lib/filePreview';
import { clearStoredSession, hasRecentAuthSuccess, mergeStoredUser, persistPhotoUrl } from '@/lib/session';

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

type JobDraft = {
  title: string;
  description: string;
  location: string;
  contract: string;
  salary: string;
};

type CandidateMatchResult = {
  candidateId: number;
  score: number;
  explanation: string;
  strengths: string[];
  gaps: string[];
};

type ApplicationStatusFilter = 'ALL' | 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';

type SidebarSection = 'dashboard' | 'post' | 'listings' | 'applications' | 'interviews' | 'cvtheque' | 'profile' | 'billing';

/* ────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────── */
function DashboardEntrepriseContent() {
  const { locale, localizePath } = useLocale();
  const searchParams = useSearchParams();
  const isEn = locale === 'en';
  const employerAccountLabel = isEn ? 'Employer account' : 'Compte entreprise';
  const recruiterLabel = isEn ? 'Recruiter' : 'Recruteur';

  // Mobile sidebar
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active sidebar section
  const [activeSection, setActiveSection] = useState<SidebarSection>('dashboard');

  // User info from localStorage
  const [accessStatus, setAccessStatus] = useState<'checking' | 'allowed' | 'unavailable'>('checking');
  const [accessError, setAccessError] = useState('');
  const [accessRetryToken, setAccessRetryToken] = useState(0);
  const [userId, setUserId] = useState(0);
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Company profile readiness
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>('');
  const [profileReviewStatus, setProfileReviewStatus] = useState<VerificationStatus>('not_submitted');
  const [isVerifiedFromBackend, setIsVerifiedFromBackend] = useState(false);

  // Job form - multi-step wizard
  const [wizardStep, setWizardStep] = useState(1);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobContract, setJobContract] = useState('CDI');
  const [jobLocation, setJobLocation] = useState('');
  const [jobSalary, setJobSalary] = useState('');
  const [isOptimizingJob, setIsOptimizingJob] = useState(false);
  const [jobAiDraft, setJobAiDraft] = useState<JobDraft | null>(null);

  // Published jobs
  const [publishMessage, setPublishMessage] = useState('');
  const [publishMessageType, setPublishMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [jobsPublishedCount, setJobsPublishedCount] = useState(0);
  const [publishedJobs, setPublishedJobs] = useState<JobEntry[]>([]);
  const [authoredJobs, setAuthoredJobs] = useState<ApiJob[]>([]);
  const [selectedMatchJobId, setSelectedMatchJobId] = useState(0);
  const [isMatchingCandidates, setIsMatchingCandidates] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [matchSource, setMatchSource] = useState<'gemini' | 'heuristic' | ''>('');
  const [candidateMatches, setCandidateMatches] = useState<CandidateMatchResult[]>([]);
  const [jobApplications, setJobApplications] = useState<ApiApplication[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [applicationActionMessage, setApplicationActionMessage] = useState('');
  const [applicationActionBusyId, setApplicationActionBusyId] = useState<number | null>(null);
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<ApplicationStatusFilter>('ALL');
  const [pendingRejectApplicationId, setPendingRejectApplicationId] = useState<number | null>(null);

  const accountKey = (companyName || userName || 'entreprise').toLowerCase();
  const hasCompanyPhoto = Boolean(companyLogoPreview || companyLogoFile);
  const isEnterprisePublishingReady = hasCompanyPhoto;
  const hasApprovedEnterpriseVerification = profileReviewStatus === 'approved';
  const isEnterpriseCertified = isVerifiedFromBackend || profileReviewStatus === 'approved';
  const companyDisplayName = companyName || userName || employerAccountLabel;

  useEffect(() => {
    if (searchParams.get('section') === 'profile') {
      setActiveSection('profile');
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    const applyUser = (user: Record<string, unknown>) => {
      setUserId(Number(user.id || 0));
      setUserName(String(user.name || user.fullName || ''));
      setCompanyName(String(user.company || user.companyName || ''));
      setIsVerifiedFromBackend(Boolean(user.isVerified));
      setCompanyLogoPreview(String(user.logoUrl || ''));
    };

    const getStoredEnterpriseUser = (): Record<string, unknown> | null => {
      try {
        const raw = localStorage.getItem('bolo237-user');
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const storedRole = String(parsed.role || localStorage.getItem('bolo237-account-role') || '').toLowerCase();
        if (storedRole !== 'entreprise') return null;
        return parsed;
      } catch {
        return null;
      }
    };

    const redirectToEmployerLogin = async () => {
      await logoutUser().catch(() => undefined);
      clearStoredSession();
      window.location.href = `${localizePath('/connexion')}?role=entreprise`;
    };

    const ensureEnterpriseAccess = async () => {
      const storedUser = getStoredEnterpriseUser();
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
          if (sessionRole === 'ARTISAN') {
            mergeStoredUser(sessionUser as unknown as Record<string, unknown>);
            window.location.href = localizePath('/dashboard-artisan');
            return;
          }
          if (sessionRole === 'ADMIN' || sessionRole === 'SUPER_ADMIN') {
            mergeStoredUser(sessionUser as unknown as Record<string, unknown>);
            window.location.href = 'https://admin.bolo237.com';
            return;
          }
          if (sessionRole !== 'ENTREPRISE') {
            await redirectToEmployerLogin();
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
              ? 'We cannot confirm your employer session right now. Please try again in a moment.'
              : 'Nous ne pouvons pas vérifier votre session entreprise pour le moment. Réessayez dans un instant.'
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
        await redirectToEmployerLogin();
        return;
      }

      await redirectToEmployerLogin();
    };

    ensureEnterpriseAccess();

    return () => {
      active = false;
    };
  }, [accessRetryToken, isEn, localizePath]);

  useEffect(() => {
    if (accessStatus !== 'allowed') {
      setProfileReviewStatus('not_submitted');
      return;
    }
    const loadVerificationStatus = async () => {
      if (!accountKey) {
        setProfileReviewStatus('not_submitted');
        return;
      }
      try {
        const status = await fetchVerificationStatus('entreprise', accountKey);
        setProfileReviewStatus(status);
        if (status === 'approved') {
          setIsVerifiedFromBackend(true);
          mergeStoredUser({ isVerified: true });
        }
      } catch {
        setProfileReviewStatus('not_submitted');
      }
    };

    loadVerificationStatus();
  }, [accessStatus, accountKey]);

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

  useEffect(() => {
    if (!userId) {
      setAuthoredJobs([]);
      return;
    }

    let active = true;

    const loadAuthoredJobs = async () => {
      try {
        const res = await fetchEnterpriseDashboardOverview();
        if (!active) return;
        setAuthoredJobs(res.jobs);

        setPublishedJobs(
          res.jobs.map((job) => ({
            id: job.id,
            title: job.title,
            contract: 'CDI',
            status: job.status === 'approved' ? 'approved' : job.status === 'rejected' ? 'rejected' : 'pending',
            date: new Date(job.createdAt).toLocaleDateString(isEn ? 'en-US' : 'fr-FR'),
          }))
        );
      } catch {
        if (!active) return;
        setAuthoredJobs([]);
      }
    };

    loadAuthoredJobs();

    return () => {
      active = false;
    };
  }, [userId, isEn]);

  useEffect(() => {
    if (selectedMatchJobId && authoredJobs.some((job) => job.id === selectedMatchJobId)) return;

    const notificationJobIds = new Set(
      notifications
        .map((n) => Number(n.data?.jobId || 0))
        .filter((id) => Number.isFinite(id) && id > 0)
    );

    const firstNotified = authoredJobs.find((job) => notificationJobIds.has(job.id));
    if (firstNotified) {
      setSelectedMatchJobId(firstNotified.id);
      return;
    }

    if (authoredJobs.length > 0) {
      setSelectedMatchJobId(authoredJobs[0].id);
    }
  }, [notifications, authoredJobs, selectedMatchJobId]);

  useEffect(() => {
    if (!selectedMatchJobId || !userId) {
      setJobApplications([]);
      return;
    }

    let active = true;
    const loadApplications = async () => {
      setIsLoadingApplications(true);
      try {
        const apps = await fetchJobApplications(selectedMatchJobId);
        if (active) setJobApplications(apps);
      } catch {
        if (active) setJobApplications([]);
      } finally {
        if (active) setIsLoadingApplications(false);
      }
    };

    loadApplications();

    return () => {
      active = false;
    };
  }, [selectedMatchJobId, userId]);

  // Get company initials
  const getInitials = useCallback(() => {
    return companyDisplayName
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [companyDisplayName]);

  const handleCompanyLogoUpload = async (file: File | null) => {
    setCompanyLogoFile(file);
    if (!file) {
      setCompanyLogoPreview('');
      mergeStoredUser({ logoUrl: '' });
      persistPhotoUrl('logoUrl', null);
      return;
    }

    try {
      const uploaded = await uploadFile(file, 'company-logos');
      setCompanyLogoPreview(uploaded.url);
      mergeStoredUser({ logoUrl: uploaded.url });
      persistPhotoUrl('logoUrl', uploaded.url);
    } catch {
      const localPreview = await fileToImageDataUrl(file);
      setCompanyLogoPreview(localPreview || '');
    }
  };

  const submitProfileReview = async () => {
    if (!companyLogoFile) {
      setPublishMessage(isEn ? 'Upload your company logo before sending your profile.' : 'Téléchargez le logo de votre entreprise avant envoi.');
      setPublishMessageType('error');
      return;
    }

    const logoPreview = await fileToImageDataUrl(companyLogoFile);

    await createVerificationSubmission({
      role: 'entreprise',
      accountKey,
      displayName: companyDisplayName,
      phone: '',
      payload: {
        userId,
        hasLogo: !!companyLogoFile,
        logoFileName: companyLogoFile?.name ?? null,
        logoPreview,
      },
    });
    setProfileReviewStatus('pending');
    setPublishMessage(
      isEn
        ? 'Profile submitted. Waiting for Super Admin approval.'
        : 'Profil envoye. En attente d approbation Super Admin.'
    );
    setPublishMessageType('info');
  };

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    location: '',
    description: '',
    salary: '',
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState('');

  const optimizeJobWithAi = async () => {
    if (!jobTitle.trim() || !jobDescription.trim()) {
      setPublishMessage(isEn ? 'Fill in title and description first.' : 'Renseignez d abord le titre et la description.');
      setPublishMessageType('error');
      return;
    }

    setIsOptimizingJob(true);
    setPublishMessage(isEn ? 'AI is optimizing your listing...' : 'L IA optimise votre annonce...');
    setPublishMessageType('info');

    try {
      const response = await fetch('/api/ai/job-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: isEn ? 'EN' : 'FR',
          role: 'company',
          companyName: companyName || userName,
          jobData: {
            title: jobTitle,
            description: jobDescription,
            location: jobLocation,
            contract: jobContract,
            salary: jobSalary,
          },
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        optimized?: JobDraft;
      };

      if (!response.ok || !payload.success || !payload.optimized) {
        throw new Error(payload.message || 'AI optimization failed');
      }

      setJobAiDraft(payload.optimized);
      setPublishMessage(isEn ? 'AI draft ready. Review before applying.' : 'Brouillon IA pret. Relisez avant application.');
      setPublishMessageType('success');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPublishMessage(isEn ? `AI optimization failed: ${message}` : `Echec optimisation IA: ${message}`);
      setPublishMessageType('error');
    } finally {
      setIsOptimizingJob(false);
    }
  };

  const applyAiJobDraft = () => {
    if (!jobAiDraft) return;
    setJobTitle(jobAiDraft.title);
    setJobDescription(jobAiDraft.description);
    setJobLocation(jobAiDraft.location);
    setJobContract(jobAiDraft.contract || 'CDI');
    setJobSalary(jobAiDraft.salary || '');
    setJobAiDraft(null);
    setPublishMessage(isEn ? 'AI draft applied. You can edit before publishing.' : 'Brouillon IA applique. Vous pouvez encore modifier.');
    setPublishMessageType('success');
  };

  /* ── Publish Job ── */
  const publishJob = async () => {
    setFormErrors({});

    const blocked = containsBlockedKeyword(`${jobTitle} ${jobDescription}`);
    if (!jobTitle.trim() || !jobDescription.trim()) {
      setFormErrors({
        ...(!jobTitle.trim() ? { title: isEn ? 'Job title is required.' : 'Le titre du poste est obligatoire.' } : {}),
        ...(!jobDescription.trim() ? { description: isEn ? 'Job description is required.' : 'La description est obligatoire.' } : {}),
      });
      setPublishMessage(isEn ? 'Fill in title and description first.' : 'Renseignez d\'abord le titre et la description.');
      setPublishMessageType('error');
      return;
    }
    if (!companyLogoFile) {
      setPublishMessage(isEn ? 'Company logo is required before publication.' : 'Le logo de l entreprise est obligatoire avant publication.');
      setPublishMessageType('error');
      return;
    }
    if (!hasApprovedEnterpriseVerification) {
      if (profileReviewStatus === 'pending') {
        setPublishMessage(
          isEn
            ? 'Your company account is being validated by our administrators. Publication is locked until approval.'
            : 'Votre compte entreprise est en cours de validation par nos administrateurs. La publication reste bloquee jusqu a approbation.'
        );
        setPublishMessageType('info');
        return;
      }

      if (profileReviewStatus === 'rejected') {
        setPublishMessage(
          isEn
            ? 'Your company verification was rejected. Update your RCCM or registration documents before publishing again.'
            : 'La vérification de votre entreprise a été refusée. Mettez à jour votre RCCM ou registre de commerce avant de republier.'
        );
        setPublishMessageType('error');
        return;
      }

      setPublishMessage(
        isEn
          ? 'Submit and validate your RCCM or company registration documents before publishing a job.'
          : 'Soumettez et faites valider votre RCCM ou registre de commerce avant de publier une offre.'
      );
      setPublishMessageType('error');
      return;
    }
    if (blocked) {
      setPublishMessage(`${isEn ? 'Blocked by anti-fraud filter keyword:' : 'Bloque par le filtre anti-fraude, mot-cle:'} "${blocked}"`);
      setPublishMessageType('error');
      return;
    }
    const canPublishMore = canPublishUnlimited(true) || jobsPublishedCount < 999;
    if (!canPublishMore) {
      setPublishMessage(isEn ? 'Publication limit reached.' : 'Limite de publication atteinte.');
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
          authorCompany = user.company || user.companyName || user.name || '';
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
      setFormErrors({});
      setWizardStep(1);
    } catch (err) {
      if (err instanceof ApiError) {
        const payload = err.details as { errors?: Array<{ champ?: string; message?: string }>; message?: string; error?: string } | undefined;
        if (payload?.errors && Array.isArray(payload.errors)) {
          const nextErrors: Record<string, string> = {};
          payload.errors.forEach((errorItem) => {
            const field = String(errorItem?.champ || '').trim();
            const message = String(errorItem?.message || '').trim();
            if (field && message) {
              nextErrors[field] = message;
            }
          });
          if (Object.keys(nextErrors).length > 0) {
            setFormErrors(nextErrors);
            setPublishMessage(
              isEn
                ? 'Please correct the highlighted form fields.'
                : 'Veuillez corriger les champs en erreur dans le formulaire.'
            );
            setPublishMessageType('error');
            return;
          }
        }
      }

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

  const openEditJob = (jobId: number) => {
    const source = authoredJobs.find((job) => job.id === jobId);
    if (!source) {
      setEditMessage(isEn ? 'Job not found for editing.' : 'Annonce introuvable pour edition.');
      return;
    }

    setEditingJobId(jobId);
    setEditFormData({
      title: source.title || '',
      location: source.location || '',
      description: source.description || '',
      salary: source.salary || '',
    });
    setEditFormErrors({});
    setEditMessage('');
  };

  const closeEditJob = () => {
    setEditingJobId(null);
    setEditFormErrors({});
    setEditMessage('');
  };

  const saveEditedJob = async () => {
    if (!editingJobId) return;

    setEditFormErrors({});
    setEditMessage('');

    const nextErrors: Record<string, string> = {};
    if (!editFormData.title.trim()) {
      nextErrors.title = isEn ? 'Job title is required.' : 'Le titre du poste est obligatoire.';
    }
    if (!editFormData.description.trim()) {
      nextErrors.description = isEn ? 'Job description is required.' : 'La description est obligatoire.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setEditFormErrors(nextErrors);
      setEditMessage(
        isEn
          ? 'Please correct the highlighted form fields.'
          : 'Veuillez corriger les champs en erreur dans le formulaire.'
      );
      return;
    }

    setIsSavingEdit(true);
    try {
      const updated = await updateJob(editingJobId, {
        title: editFormData.title.trim(),
        location: editFormData.location.trim(),
        description: editFormData.description.trim(),
        salary: editFormData.salary.trim() || null,
      });

      setAuthoredJobs((prev) => prev.map((job) => (job.id === editingJobId ? { ...job, ...updated } : job)));
      setPublishedJobs((prev) => prev.map((job) => (job.id === editingJobId ? { ...job, title: updated.title } : job)));
      closeEditJob();
    } catch (error) {
      if (error instanceof ApiError) {
        const payload = error.details as { errors?: Array<{ champ?: string; message?: string }>; message?: string; error?: string } | undefined;
        if (payload?.errors && Array.isArray(payload.errors)) {
          const mappedErrors: Record<string, string> = {};
          payload.errors.forEach((item) => {
            const field = String(item?.champ || '').trim();
            const message = String(item?.message || '').trim();
            if (field && message) {
              mappedErrors[field] = message;
            }
          });
          if (Object.keys(mappedErrors).length > 0) {
            setEditFormErrors(mappedErrors);
            setEditMessage(
              isEn
                ? 'Please correct the highlighted form fields.'
                : 'Veuillez corriger les champs en erreur dans le formulaire.'
            );
            return;
          }
        }
      }

      const message = error instanceof Error ? error.message : String(error);
      setEditMessage(isEn ? `Unable to update this listing: ${message}` : `Impossible de mettre a jour cette annonce : ${message}`);
    } finally {
      setIsSavingEdit(false);
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

  const matchCandidatesWithAi = async () => {
    if (!selectedMatchJobId) {
      setMatchError(isEn ? 'Select a job listing first.' : 'Sélectionnez d\'abord une annonce.');
      return;
    }

    const targetJob = authoredJobs.find((job) => job.id === selectedMatchJobId);
    if (!targetJob) {
      setMatchError(isEn ? 'Selected job is unavailable.' : 'Annonce selectionnee introuvable.');
      return;
    }

    const candidateIds = Array.from(
      new Set(
        notifications
          .map((n) => Number(n.data?.candidateId || 0))
          .filter((id) => Number.isFinite(id) && id > 0)
      )
    );

    if (candidateIds.length === 0) {
      setMatchError(isEn ? 'No candidate applications available yet.' : 'Aucune candidature exploitable pour le moment.');
      return;
    }

    setIsMatchingCandidates(true);
    setMatchError('');
    setMatchSource('');
    setCandidateMatches([]);

    try {
      const details = await Promise.all(
        candidateIds.map(async (candidateId) => {
          try {
            return await fetchCandidateProfileDetail(candidateId);
          } catch {
            return null;
          }
        })
      );

      const candidates = details
        .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
        .map((candidate) => ({
          candidateId: candidate.id,
          fullName: candidate.profile?.fullName || candidate.nom || `Candidat #${candidate.id}`,
          title: candidate.profile?.title || candidate.titre || '',
          location: candidate.profile?.location || candidate.localisation || '',
          skillsText: candidate.profile?.skillsText || (candidate.competences || []).join(', '),
          profile: candidate.profile?.profile || '',
          experience: candidate.profile?.experience || '',
          education: candidate.profile?.education || '',
        }))
        .filter((candidate) =>
          Boolean(
            candidate.skillsText.trim() ||
            candidate.profile.trim() ||
            candidate.experience.trim() ||
            candidate.education.trim()
          )
        );

      if (candidates.length === 0) {
        throw new Error(isEn ? 'Candidate profiles are still incomplete.' : 'Les profils candidats sont encore incomplets.');
      }

      const response = await fetch('/api/ai/candidate-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: isEn ? 'EN' : 'FR',
          jobData: {
            title: targetJob.title,
            description: targetJob.description,
            location: targetJob.location,
            salary: targetJob.salary || '',
          },
          candidates,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        source?: 'gemini' | 'heuristic';
        message?: string;
        matches?: CandidateMatchResult[];
      };

      if (!response.ok || !payload.success || !Array.isArray(payload.matches)) {
        throw new Error(payload.message || (isEn ? 'Candidate matching failed.' : 'Echec du matching candidats.'));
      }

      setMatchSource(payload.source || '');
      setCandidateMatches(payload.matches.slice(0, 10));
      if (payload.source === 'heuristic') {
        setMatchError(isEn ? 'Temporary fallback scoring used. Gemini unavailable.' : 'Scoring de secours utilise temporairement. Gemini indisponible.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMatchError(message);
    } finally {
      setIsMatchingCandidates(false);
    }
  };

  const applicationStatusUi = (status: string) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'ACCEPTED') {
      return {
        label: isEn ? 'Accepted' : 'Acceptee',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }

    if (normalized === 'REJECTED') {
      return {
        label: isEn ? 'Rejected' : 'Refusee',
        className: 'bg-red-50 text-red-700 border-red-200',
      };
    }

    if (normalized === 'REVIEWED') {
      return {
        label: isEn ? 'Reviewed' : 'Vue',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }

    return {
      label: isEn ? 'Pending' : 'En attente',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  };

  const handleApplicationStatusUpdate = async (
    applicationId: number,
    status: 'REVIEWED' | 'ACCEPTED' | 'REJECTED'
  ) => {
    if (!selectedMatchJobId) return;

    setApplicationActionMessage('');
    setApplicationActionBusyId(applicationId);

    try {
      const updated = await updateApplicationStatus(applicationId, status);
      setJobApplications((prev) =>
        prev.map((item) => (item.id === applicationId ? { ...item, status: updated.status } : item))
      );

      setApplicationActionMessage(
        isEn
          ? 'Application status updated successfully.'
          : 'Le statut de la candidature a ete mis a jour avec succes.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setApplicationActionMessage(
        isEn
          ? `Unable to update application status: ${message}`
          : `Impossible de mettre a jour le statut de candidature : ${message}`
      );
    } finally {
      setApplicationActionBusyId(null);
    }
  };

  const filteredJobApplications = jobApplications.filter((application) => {
    if (applicationStatusFilter === 'ALL') return true;
    return String(application.status || '').toUpperCase() === applicationStatusFilter;
  });

  const applicationStatusCounts: Record<ApplicationStatusFilter, number> = {
    ALL: jobApplications.length,
    PENDING: 0,
    REVIEWED: 0,
    ACCEPTED: 0,
    REJECTED: 0,
  };

  jobApplications.forEach((application) => {
    const normalized = String(application.status || 'PENDING').toUpperCase();
    if (normalized === 'REVIEWED' || normalized === 'ACCEPTED' || normalized === 'REJECTED') {
      applicationStatusCounts[normalized] += 1;
      return;
    }
    applicationStatusCounts.PENDING += 1;
  });

  const applicationStatusChipClass: Record<ApplicationStatusFilter, string> = {
    ALL: 'border-gray-200 bg-gray-50 text-gray-700',
    PENDING: 'border-blue-200 bg-blue-50 text-blue-700',
    REVIEWED: 'border-amber-200 bg-amber-50 text-amber-700',
    ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    REJECTED: 'border-red-200 bg-red-50 text-red-700',
  };

  const applyStatusFilterOptions: Array<{ value: ApplicationStatusFilter; label: string }> = [
    { value: 'ALL', label: isEn ? 'All statuses' : 'Tous les statuts' },
    { value: 'PENDING', label: isEn ? 'Pending' : 'En attente' },
    { value: 'REVIEWED', label: isEn ? 'Reviewed' : 'Vue' },
    { value: 'ACCEPTED', label: isEn ? 'Accepted' : 'Acceptée' },
    { value: 'REJECTED', label: isEn ? 'Rejected' : 'Refusée' },
  ];

  /* ── Status badge helper ── */
  const statusBadge = (status: JobEntry['status']) => {
    const map = {
      pending: {
        label: isEn ? 'Pending' : 'En attente',
        bg: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      },
      approved: {
        label: isEn ? 'Approved' : 'Approuvée',
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

  const detectedCandidateCount = new Set(
    notifications
      .map((notification) => Number(notification.data?.candidateId || 0))
      .filter((candidateId) => Number.isFinite(candidateId) && candidateId > 0)
  ).size;
  const approvedJobsCount = publishedJobs.filter((job) => job.status === 'approved').length;
  const pendingJobsCount = publishedJobs.filter((job) => job.status === 'pending').length;
  const recentApplicationNotifications = notifications.slice(0, 5);
  const topMatchedCandidates = candidateMatches.slice(0, 5);
  const selectedMatchJob = authoredJobs.find((job) => job.id === selectedMatchJobId) || null;

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
  if (accessStatus === 'unavailable') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-blue-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl text-blue-700">
            !
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-gray-900">
            {isEn ? 'Session service temporarily unavailable' : 'Service de session temporairement indisponible'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {accessError || (isEn ? 'Please retry in a few moments.' : 'Réessayez dans quelques instants.')}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                setAccessError('');
                setAccessStatus('checking');
                setAccessRetryToken((value) => value + 1);
              }}
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700"
            >
              {isEn ? 'Retry access check' : 'Relancer la vérification'}
            </button>
            <Link
              href={`${localizePath('/connexion')}?role=entreprise`}
              className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-extrabold text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
            >
              {isEn ? 'Go to employer sign in' : 'Aller à la connexion entreprise'}
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
          <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-gray-600">
            {isEn ? 'Checking your employer access...' : 'Vérification de votre accès entreprise...'}
          </p>
        </div>
      </div>
    );
  }

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
              title={isEn ? 'Open applications inbox' : 'Ouvrir la boîte de candidatures'}
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
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {companyLogoPreview ? (
                  <Image src={companyLogoPreview} alt="Logo entreprise" width={36} height={36} className="w-full h-full object-cover" />
                ) : (
                  getInitials()
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-bold text-gray-800 leading-tight">{companyDisplayName}</p>
                <p className="text-[11px] text-gray-400 font-medium leading-tight">{recruiterLabel}</p>
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
          <button
            type="button"
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={isEn ? 'Close sidebar menu' : 'Fermer le menu lateral'}
          />
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
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-700 rounded-2xl p-5 text-white relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
              <div className="relative">
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-extrabold mb-3 border border-white/20 overflow-hidden">
                  {companyLogoPreview ? (
                    <Image src={companyLogoPreview} alt="Logo entreprise" width={56} height={56} className="w-full h-full object-cover" />
                  ) : (
                    getInitials()
                  )}
                </div>
                <p className="font-bold text-[15px] leading-tight truncate">
                  {companyDisplayName}
                </p>
                <p className="text-white/70 text-xs font-medium mt-0.5">
                  {recruiterLabel}
                </p>
                <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full mt-3 ${
                  isEnterpriseCertified
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-400/90 text-amber-900'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isEnterpriseCertified ? 'bg-blue-200' : 'bg-amber-700'}`} />
                  {isEnterpriseCertified
                    ? (isEn ? 'CERTIFIED ACCOUNT' : 'COMPTE CERTIFIÉ')
                    : (isEn ? 'UNVERIFIED' : 'NON VÉRIFIÉ')}
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
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <span className="text-base w-6 text-center">{item.icon}</span>
                <span>{item.label}</span>
                {item.key === 'applications' && (
                  <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </button>
            ))}

            {/* Separator */}
            <div className="border-t border-gray-100 my-3" />

            {/* Launch offer banner in sidebar */}
            <div className="mx-2 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-xl p-4 text-white">
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
            <button
              onClick={() => {
                logoutUser().catch(() => undefined);
                clearStoredSession();
                window.location.href = localizePath('/');
              }}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition"
            >
              <span className="text-base w-6 text-center">{'\u{1F6AA}'}</span>
              <span>{isEn ? 'Logout' : 'Déconnexion'}</span>
            </button>
          </nav>
        </aside>

        {/* ── MAIN CONTENT AREA ── */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-8">
          <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 sm:py-8">

            {/* Welcome banner - UNIQUEMENT SUR L'ACCUEIL */}
            {activeSection === 'dashboard' && (
              <div className="mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                  {isEn ? 'Welcome back' : 'Bienvenue'} {companyName ? `— ${companyName}` : ''} {'\u{1F44B}'}
                </h1>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  {isEn ? 'Manage your job listings and find the best candidates.' : 'Gérez vos offres d\'emploi et trouvez les meilleurs candidats.'}
                </p>
              </div>
            )}

            {/* ═══ DASHBOARD VIEW ═══ */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                {/* Enterprise Lock Banner */}
                {(() => {
                  const hasLogo = hasCompanyPhoto;
                  const isApproved = profileReviewStatus === 'approved';
                  const allReady = hasLogo;
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
                              ? (isEn ? 'Your account is verified — you can publish jobs!' : 'Votre compte est vérifié — vous pouvez publier des offres !')
                              : (isEn ? 'Complete your profile to publish jobs' : 'Complétez votre profil pour publier des offres')}
                          </p>
                          <p className={`text-xs font-medium mt-1 ${allReady ? 'text-green-600' : 'text-amber-700'}`}>
                            {allReady
                              ? (isEn ? 'All requirements have been met.' : 'Toutes les conditions sont remplies.')
                              : (isEn ? 'Add your logo photo to unlock publication.' : 'Ajoutez la photo/logo de votre entreprise pour publier.')}
                          </p>
                          {/* Checklist */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
                            <span className={`text-xs font-semibold flex items-center gap-1 ${hasLogo ? 'text-green-700' : 'text-gray-400'}`}>
                              {hasLogo ? '\u2713' : '\u25CB'} {isEn ? 'Company logo' : 'Logo entreprise'}
                            </span>
                            <span className={`text-xs font-semibold flex items-center gap-1 ${isApproved ? 'text-green-700' : 'text-gray-400'}`}>
                              {isApproved ? '\u2713' : '\u25CB'} {isEn ? 'Admin approved profile' : 'Profil approuvé par admin'}
                            </span>
                          </div>
                          {!allReady && (
                            <button
                              onClick={() => navigateTo('post')}
                              className="mt-3 inline-flex items-center gap-1.5 bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-700 transition-all active:scale-[0.98]"
                            >
                              {isEn ? 'Complete verification' : 'Compléter la vérification'} &rarr;
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
                    <p className="text-blue-200 text-[11px] font-medium mt-1">{isEn ? 'Published' : 'Publiées'}</p>
                  </div>

                  {/* Pending */}
                  <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                    <p className="text-amber-100 text-[11px] sm:text-xs font-bold uppercase tracking-wide">{isEn ? 'Pending' : 'En attente'}</p>
                    <p className="text-2xl sm:text-3xl font-extrabold mt-2">{String(publishedJobs.filter(j => j.status === 'pending').length).padStart(2, '0')}</p>
                    <p className="text-amber-200 text-[11px] font-medium mt-1">{isEn ? 'Under review' : 'En modération'}</p>
                  </div>

                  {/* Applications */}
                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
                    <p className="text-emerald-100 text-[11px] sm:text-xs font-bold uppercase tracking-wide">{isEn ? 'Applications' : 'Candidatures'}</p>
                    <p className="text-2xl sm:text-3xl font-extrabold mt-2">{String(unreadNotifications).padStart(2, '0')}</p>
                    <p className="text-emerald-200 text-[11px] font-medium mt-1">{isEn ? 'To review' : 'À examiner'}</p>
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
                    disabled={!isEnterprisePublishingReady}
                    className={`group rounded-2xl p-6 text-center transition-all ${
                      isEnterprisePublishingReady
                        ? 'bg-white border-2 border-dashed border-green-300 hover:border-green-500 hover:shadow-lg cursor-pointer'
                        : 'bg-gray-50 border-2 border-dashed border-gray-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition text-2xl ${
                      isEnterprisePublishingReady
                        ? 'bg-green-50 group-hover:bg-green-100'
                        : 'bg-gray-100'
                    }`}>
                      {isEnterprisePublishingReady ? '\u{1F4DD}' : '\uD83D\uDD12'}
                    </div>
                    <p className={`font-bold text-[15px] ${
                      isEnterprisePublishingReady ? 'text-gray-900' : 'text-gray-400'
                    }`}>{isEn ? 'Post a New Job' : 'Publier une nouvelle offre'}</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      {isEnterprisePublishingReady
                        ? (isEn ? 'Free during launch' : 'Gratuit pendant le lancement')
                        : (isEn ? 'Add your logo photo first' : 'Ajoutez d\'abord votre photo/logo')}
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
                    <p className="text-xs text-gray-500 font-medium mt-1">{jobsPublishedCount} {isEn ? 'total posted' : 'publiées au total'}</p>
                  </button>
                </div>

                {/* Recent jobs list - VERSION PREMIUM */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-6">
                  <div className="px-5 sm:px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                      <h3 className="font-bold text-gray-900 text-[16px]">{isEn ? 'Recent Listings' : 'Annonces récentes'}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{isEn ? 'Manage your latest job posts.' : 'Gérez vos dernières publications.'}</p>
                    </div>
                    {publishedJobs.length > 0 && (
                      <button onClick={() => navigateTo('listings')} className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1">
                        {isEn ? 'View all' : 'Tout voir'} <span className="text-lg">→</span>
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
                          : 'Publiez votre première offre pour commencer à recevoir des candidatures.'}
                      </p>
                      <button
                        onClick={() => navigateTo('post')}
                        className="mt-5 bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-green-700 transition-all hover:shadow-lg active:scale-[0.98]"
                      >
                        {isEn ? 'Post your first job' : 'Publier ma première offre'}
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {publishedJobs.slice(0, 5).map(job => (
                        <div key={job.id} className="group px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-blue-50/30 transition-all duration-200">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors shrink-0">
                              {'\u{1F4BC}'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-gray-900 text-[15px] group-hover:text-blue-700 transition-colors cursor-pointer truncate">
                                {job.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-1 flex-wrap">
                                <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-600">{job.contract}</span>
                                <span>•</span>
                                <span>{isEn ? 'Posted on' : 'Publié le'} {job.date}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-3 sm:mt-0">
                            {statusBadge(job.status)}

                            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                              <button
                                title={isEn ? 'View Candidates' : 'Voir les candidats'}
                                onClick={() => {
                                  setSelectedMatchJobId(job.id);
                                  navigateTo('applications');
                                }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              >
                                {'\u{1F465}'}
                              </button>
                              <button
                                title={isEn ? 'Edit Job' : "Modifier l'offre"}
                                onClick={() => navigateTo('listings')}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                {'\u270F\uFE0F'}
                              </button>
                              {job.status !== 'rejected' && (
                                <button
                                  title={isEn ? 'Close Job' : "Cloturer l'offre"}
                                  onClick={() => navigateTo('listings')}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  {'\u{1F6D1}'}
                                </button>
                              )}
                            </div>
                          </div>
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
                      {isEn ? 'Step' : 'Étape'} {wizardStep}/3
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
                      {isEn ? 'Profile Setup' : 'Profil'}
                    </p>
                    <p className={`text-[11px] sm:text-xs font-bold text-center ${wizardStep >= 2 ? 'text-green-700' : 'text-gray-400'}`}>
                      {isEn ? 'Job Details' : 'Détails offre'}
                    </p>
                    <p className={`text-[11px] sm:text-xs font-bold text-center ${wizardStep >= 3 ? 'text-green-700' : 'text-gray-400'}`}>
                      {isEn ? 'Review & Post' : 'Relecture'}
                    </p>
                  </div>

                  {/* ── STEP 1: Profile setup ── */}
                  {wizardStep === 1 && (
                    <div className="space-y-5">
                      <div className={`rounded-2xl p-5 sm:p-6 border-2 transition-all ${
                        hasCompanyPhoto
                          ? 'bg-green-50 border-green-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                            hasCompanyPhoto ? 'bg-green-200' : 'bg-amber-200'
                          }`}>
                            {hasCompanyPhoto ? '\u2705' : '\u{1F3E2}'}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${hasCompanyPhoto ? 'text-green-800' : 'text-amber-800'}`}>
                              {hasCompanyPhoto
                                ? (isEn ? 'Company profile ready!' : 'Profil entreprise prêt !')
                                : (isEn ? 'Company logo required' : 'Logo entreprise requis')}
                            </p>
                            <p className={`text-xs font-medium mt-0.5 ${hasCompanyPhoto ? 'text-green-600' : 'text-amber-700'}`}>
                              {isEn
                                ? 'Upload your company logo to unlock posting.'
                                : 'Téléchargez votre logo entreprise pour débloquer la publication.'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-3 tracking-wider">
                            {isEn ? 'Company logo / profile photo' : 'Logo / photo entreprise'}
                          </label>

                          <div className="flex items-center gap-5">
                            <label className="relative cursor-pointer group flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-500 transition-all overflow-hidden shadow-sm">
                              {companyLogoPreview ? (
                                <Image src={companyLogoPreview} alt="Logo" width={112} height={112} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center text-gray-400 group-hover:text-blue-500 transition-colors">
                                  <span className="text-2xl sm:text-3xl font-extrabold">{getInitials()}</span>
                                  <span className="text-[10px] mt-1 font-bold uppercase tracking-wide">Upload</span>
                                </div>
                              )}

                              <input
                                type="file"
                                accept="image/jpeg, image/png, image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  handleCompanyLogoUpload(e.target.files?.[0] ?? null);
                                  if (profileReviewStatus === 'approved') {
                                    setProfileReviewStatus('not_submitted');
                                  }
                                }}
                              />

                              {companyLogoPreview && (
                                <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center text-white text-xs font-bold transition-all backdrop-blur-sm">
                                  {isEn ? 'Change' : 'Modifier'}
                                </div>
                              )}
                            </label>

                            <div className="flex-1">
                              <p className="text-sm font-bold text-gray-900 mb-1">
                                {isEn ? 'Professional Logo' : 'Logo Professionnel'}
                              </p>
                              <p className="text-xs text-gray-500 font-medium">
                                {isEn ? 'Format: JPG, PNG, WEBP. Max size: 5MB.' : 'Format: JPG, PNG, WEBP. Taille max: 5 Mo.'}
                              </p>
                              {companyLogoFile && (
                                <p className="mt-2 text-[11px] font-bold text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded-md">
                                  {companyLogoFile.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={`rounded-2xl p-5 sm:p-6 border-2 transition-all ${
                        profileReviewStatus === 'approved' ? 'bg-green-50 border-green-200' : profileReviewStatus === 'pending' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-start gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${profileReviewStatus === 'approved' ? 'bg-green-200' : profileReviewStatus === 'pending' ? 'bg-blue-200' : 'bg-amber-200'}`}>
                            {profileReviewStatus === 'approved' ? '\u2705' : profileReviewStatus === 'pending' ? '\u{23F3}' : '\u{1F6E1}'}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${profileReviewStatus === 'approved' ? 'text-green-800' : profileReviewStatus === 'pending' ? 'text-blue-800' : 'text-amber-800'}`}>
                              {profileReviewStatus === 'approved'
                                ? (isEn ? 'Approved by Super Admin' : 'Approuvé par le Super Admin')
                                : profileReviewStatus === 'pending'
                                  ? (isEn ? 'Pending Super Admin review' : 'En attente de validation Super Admin')
                                  : (isEn ? 'Submit your profile for admin review' : 'Soumettez votre profil à la validation admin')}
                            </p>
                            <p className={`text-xs font-medium mt-0.5 ${profileReviewStatus === 'approved' ? 'text-green-600' : profileReviewStatus === 'pending' ? 'text-blue-700' : 'text-amber-700'}`}>
                              {isEn
                                ? 'Admin review is optional for publication, but recommended to build trust.'
                                : 'La validation admin est optionnelle pour publier, mais recommandée pour la confiance.'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button
                            onClick={submitProfileReview}
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
                          if (isEnterprisePublishingReady) {
                            setPublishMessage('');
                            setWizardStep(2);
                          } else {
                            setPublishMessage(
                              isEn
                                ? 'Add your company logo photo before continuing.'
                                : 'Ajoutez la photo/logo de votre entreprise avant de continuer.'
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
                            onChange={(e) => {
                              setJobTitle(e.target.value);
                              setFormErrors((prev) => {
                                if (!prev.title) return prev;
                                const next = { ...prev };
                                delete next.title;
                                return next;
                              });
                            }}
                            placeholder={isEn ? 'e.g. Senior Accountant' : 'ex: Comptable Senior'}
                            className={`w-full p-3.5 border rounded-xl outline-none bg-gray-50/50 text-sm ${formErrors.title ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500'}`}
                          />
                          {formErrors.title ? (
                            <p className="mt-1 text-xs font-bold text-red-500">{formErrors.title}</p>
                          ) : null}
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                            {isEn ? 'Contract Type' : 'Type de contrat'}
                          </label>
                          <select
                            value={jobContract}
                            onChange={(e) => {
                              setJobContract(e.target.value);
                              setFormErrors((prev) => {
                                if (!prev.contractType) return prev;
                                const next = { ...prev };
                                delete next.contractType;
                                return next;
                              });
                            }}
                            className={`w-full p-3.5 border rounded-xl outline-none bg-gray-50/50 text-sm cursor-pointer ${formErrors.contractType ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500'}`}
                          >
                            <option value="CDI">CDI</option>
                            <option value="CDD">CDD</option>
                            <option value="Stage">Stage</option>
                            <option value="Freelance">Freelance</option>
                          </select>
                          {formErrors.contractType ? (
                            <p className="mt-1 text-xs font-bold text-red-500">{formErrors.contractType}</p>
                          ) : null}
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
                            onChange={(e) => {
                              setJobLocation(e.target.value);
                              setFormErrors((prev) => {
                                if (!prev.location) return prev;
                                const next = { ...prev };
                                delete next.location;
                                return next;
                              });
                            }}
                            placeholder={isEn ? 'e.g. Douala, Cameroon' : 'ex: Douala, Cameroun'}
                            className={`w-full p-3.5 border rounded-xl outline-none bg-gray-50/50 text-sm ${formErrors.location ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500'}`}
                          />
                          {formErrors.location ? (
                            <p className="mt-1 text-xs font-bold text-red-500">{formErrors.location}</p>
                          ) : null}
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                            {isEn ? 'Salary (optional)' : 'Salaire (optionnel)'}
                          </label>
                          <input
                            type="text"
                            value={jobSalary}
                            onChange={(e) => {
                              setJobSalary(e.target.value);
                              setFormErrors((prev) => {
                                if (!prev.salary) return prev;
                                const next = { ...prev };
                                delete next.salary;
                                return next;
                              });
                            }}
                            placeholder={isEn ? 'e.g. 250,000 - 400,000 FCFA' : 'ex: 250 000 - 400 000 FCFA'}
                            className={`w-full p-3.5 border rounded-xl outline-none bg-gray-50/50 text-sm ${formErrors.salary ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500'}`}
                          />
                          {formErrors.salary ? (
                            <p className="mt-1 text-xs font-bold text-red-500">{formErrors.salary}</p>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">
                          {isEn ? 'Job Description' : 'Description des missions'} *
                        </label>
                        <textarea
                          value={jobDescription}
                          onChange={(e) => {
                            setJobDescription(e.target.value);
                            setFormErrors((prev) => {
                              if (!prev.description) return prev;
                              const next = { ...prev };
                              delete next.description;
                              return next;
                            });
                          }}
                          placeholder={isEn ? 'Describe the responsibilities, requirements, and qualifications...' : 'Decrivez les responsabilites, exigences et qualifications...'}
                          className={`w-full h-40 sm:h-48 p-4 border rounded-xl outline-none bg-gray-50/50 resize-none text-sm ${formErrors.description ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500'}`}
                        />
                        {formErrors.description ? (
                          <p className="mt-1 text-xs font-bold text-red-500">{formErrors.description}</p>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={optimizeJobWithAi}
                          disabled={isOptimizingJob}
                          className="w-full sm:w-auto bg-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-700 transition disabled:opacity-60"
                        >
                          {isOptimizingJob
                            ? (isEn ? 'AI is optimizing...' : 'Optimisation IA...')
                            : `✨ ${isEn ? 'Optimize with AI' : 'Optimiser avec l IA'}`}
                        </button>

                        {isOptimizingJob && (
                          <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 animate-pulse">
                            <p className="text-xs font-bold text-purple-700">
                              {isEn ? 'AI analyzes your listing and improves clarity...' : 'L IA analyse votre annonce et ameliore la clarte...'}
                            </p>
                          </div>
                        )}

                        {jobAiDraft && (
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
                              {isEn ? 'AI draft (editable)' : 'Brouillon IA (modifiable)'}
                            </p>
                            <input
                              value={jobAiDraft.title}
                              onChange={(e) => setJobAiDraft((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
                            />
                            <textarea
                              value={jobAiDraft.description}
                              onChange={(e) => setJobAiDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                              className="w-full h-28 p-2.5 border border-gray-200 rounded-lg text-sm resize-none"
                            />
                            <button
                              onClick={applyAiJobDraft}
                              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition"
                            >
                              {isEn ? 'Apply this version' : 'Appliquer cette version'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Anti-fraud notice */}
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-start gap-3">
                        <span className="text-xl shrink-0">{'\u{1F6E1}'}</span>
                        <div className="text-xs text-gray-600 font-medium">
                          <p className="font-bold text-gray-800 mb-1">{isEn ? 'Anti-Fraud Filter Active' : 'Filtre anti-fraude actif'}</p>
                          <p>
                            {isEn
                              ? 'Posts containing "frais de dossier", "transfert mobile money", or "investissement" will be automatically blocked. The first 3 publications go through admin review (quarantine).'
                              : 'Les offres contenant "frais de dossier", "transfert mobile money", ou "investissement" sont automatiquement bloquées. Les 3 premières publications passent en modération admin (quarantaine).'}
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
                              setPublishMessage(`${isEn ? 'Blocked by anti-fraud filter:' : 'Bloqué par le filtre anti-fraude :'} "${blocked}"`);
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
                              <p className="font-bold text-gray-900 text-sm">{jobLocation || (isEn ? 'Not specified' : 'Non spécifié')}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">{isEn ? 'Salary' : 'Salaire'}</p>
                              <p className="font-bold text-gray-900 text-sm">{jobSalary || (isEn ? 'Not specified' : 'Non spécifié')}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">{isEn ? 'Description' : 'Description'}</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{jobDescription}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1">{isEn ? 'Company' : 'Entreprise'}</p>
                            <p className="font-bold text-green-600 text-sm flex items-center gap-1.5">
                              {'\u2705'} {companyName || userName || '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Moderation notice */}
                      {jobsPublishedCount < 3 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                          <span className="text-xl shrink-0">{'\u{23F3}'}</span>
                          <div className="text-xs text-amber-800 font-medium">
                            <p className="font-bold mb-0.5">{isEn ? 'Moderation Notice' : 'Avis de modération'}</p>
                            <p>
                              {isEn
                                ? `This is publication ${jobsPublishedCount + 1}/3. Your first 3 posts are reviewed by an admin before going live.`
                                : `Ceci est la publication ${jobsPublishedCount + 1}/3. Vos 3 premières offres sont validées par un admin avant mise en ligne.`}
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
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900">{isEn ? 'My Job Listings' : 'Mes annonces'}</h2>
                    <p className="text-sm text-gray-500">{isEn ? 'Manage all your published and pending jobs.' : 'Gérez toutes vos offres publiées et en attente.'}</p>
                  </div>
                  <button
                    onClick={() => navigateTo('post')}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition shadow-sm active:scale-[0.98] self-start"
                  >
                    + {isEn ? 'New Job' : 'Nouvelle offre'}
                  </button>
                </div>

                {publishedJobs.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center">
                    <div className="text-5xl mb-4">{'\u{1F4CB}'}</div>
                    <h4 className="font-bold text-gray-900 mb-2">{isEn ? 'No listings yet' : 'Aucune annonce'}</h4>
                    <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto">
                      {isEn ? 'Your job listings will appear here.' : 'Vos annonces apparaîtront ici.'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
                    {publishedJobs.map(job => (
                      <div key={job.id} className="group px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-blue-50/30 transition-all duration-200">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors text-xl shrink-0">
                            {'\u{1F4BC}'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-gray-900 text-[15px] group-hover:text-blue-700 transition-colors cursor-pointer truncate">
                              {job.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-1 flex-wrap">
                              <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-600">{job.contract}</span>
                              <span>•</span>
                              <span>{isEn ? 'Posted on' : 'Publié le'} {job.date}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4 sm:mt-0">
                          {statusBadge(job.status)}

                          <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              title={isEn ? 'View Candidates' : 'Voir les candidats'}
                              onClick={() => { setSelectedMatchJobId(job.id); navigateTo('applications'); }}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              {'\u{1F465}'}
                            </button>
                            <button
                              title={isEn ? 'Edit Job' : "Modifier l'offre"}
                              onClick={() => openEditJob(job.id)}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              {'\u270F\uFE0F'}
                            </button>
                            {job.status !== 'rejected' && (
                              <button
                                title={isEn ? 'Close Job' : "Cloturer l'offre"}
                                onClick={() => navigateTo('listings')}
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                {'\u{1F6D1}'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {editingJobId ? (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
                      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <h3 className="text-base font-extrabold text-gray-900">
                          {isEn ? 'Edit job listing' : 'Modifier une annonce'}
                        </h3>
                        <button
                          type="button"
                          onClick={closeEditJob}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                        >
                          {isEn ? 'Close' : 'Fermer'}
                        </button>
                      </div>

                      <div className="space-y-4 p-5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                            {isEn ? 'Job title' : 'Intitule du poste'}
                          </label>
                          <input
                            type="text"
                            value={editFormData.title}
                            onChange={(event) => {
                              const value = event.target.value;
                              setEditFormData((prev) => ({ ...prev, title: value }));
                              setEditFormErrors((prev) => {
                                if (!prev.title) return prev;
                                const next = { ...prev };
                                delete next.title;
                                return next;
                              });
                            }}
                            className={`w-full rounded-xl border p-3 text-sm outline-none ${editFormErrors.title ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-green-500 focus:border-green-500'}`}
                          />
                          {editFormErrors.title ? <p className="mt-1 text-xs font-bold text-red-500">{editFormErrors.title}</p> : null}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                              {isEn ? 'Location' : 'Lieu'}
                            </label>
                            <input
                              type="text"
                              value={editFormData.location}
                              onChange={(event) => {
                                const value = event.target.value;
                                setEditFormData((prev) => ({ ...prev, location: value }));
                                setEditFormErrors((prev) => {
                                  if (!prev.location) return prev;
                                  const next = { ...prev };
                                  delete next.location;
                                  return next;
                                });
                              }}
                              className={`w-full rounded-xl border p-3 text-sm outline-none ${editFormErrors.location ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-green-500 focus:border-green-500'}`}
                            />
                            {editFormErrors.location ? <p className="mt-1 text-xs font-bold text-red-500">{editFormErrors.location}</p> : null}
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                              {isEn ? 'Salary (optional)' : 'Salaire (optionnel)'}
                            </label>
                            <input
                              type="text"
                              value={editFormData.salary}
                              onChange={(event) => {
                                const value = event.target.value;
                                setEditFormData((prev) => ({ ...prev, salary: value }));
                                setEditFormErrors((prev) => {
                                  if (!prev.salary) return prev;
                                  const next = { ...prev };
                                  delete next.salary;
                                  return next;
                                });
                              }}
                              className={`w-full rounded-xl border p-3 text-sm outline-none ${editFormErrors.salary ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-green-500 focus:border-green-500'}`}
                            />
                            {editFormErrors.salary ? <p className="mt-1 text-xs font-bold text-red-500">{editFormErrors.salary}</p> : null}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                            {isEn ? 'Job description' : 'Description des missions'}
                          </label>
                          <textarea
                            value={editFormData.description}
                            onChange={(event) => {
                              const value = event.target.value;
                              setEditFormData((prev) => ({ ...prev, description: value }));
                              setEditFormErrors((prev) => {
                                if (!prev.description) return prev;
                                const next = { ...prev };
                                delete next.description;
                                return next;
                              });
                            }}
                            className={`h-36 w-full resize-none rounded-xl border p-3 text-sm outline-none ${editFormErrors.description ? 'border-red-500 bg-red-50 focus:ring-2 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-green-500 focus:border-green-500'}`}
                          />
                          {editFormErrors.description ? <p className="mt-1 text-xs font-bold text-red-500">{editFormErrors.description}</p> : null}
                        </div>

                        {editMessage ? (
                          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                            {editMessage}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={closeEditJob}
                          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                          {isEn ? 'Cancel' : 'Annuler'}
                        </button>
                        <button
                          type="button"
                          onClick={saveEditedJob}
                          disabled={isSavingEdit}
                          className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          {isSavingEdit ? (isEn ? 'Saving...' : 'Enregistrement...') : (isEn ? 'Save changes' : 'Enregistrer')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* ═══ PROFILE / VERIFICATION VIEW ═══ */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-lg font-extrabold text-gray-900">{isEn ? 'Company Profile' : 'Profil Entreprise'}</h2>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                    <span className="text-xl">{'\u{1F6E1}'}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{isEn ? 'Trust Profile' : 'Profil de confiance'}</p>
                      <p className="text-xs text-gray-500">{isEn ? 'A serious profile improves conversion and credibility.' : 'Un profil sérieux améliore la conversion et la crédibilité.'}</p>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className={`rounded-xl p-4 border-2 ${isEnterpriseCertified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isEnterpriseCertified ? 'bg-green-500' : 'bg-amber-500'}`} />
                        <p className={`text-sm font-bold ${isEnterpriseCertified ? 'text-green-800' : 'text-amber-800'}`}>
                          {isEnterpriseCertified
                            ? (isEn ? 'Verified badge active' : 'Badge vérifié actif')
                            : (isEn ? 'Awaiting admin validation' : 'En attente de validation admin')}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">
                        {isEn
                          ? 'Admins can validate serious accounts directly from the admin panel.'
                          : 'Les admins peuvent valider les comptes sérieux directement depuis le panel admin.'}
                      </p>
                    </div>

                    <div className={`rounded-xl p-4 border-2 ${hasCompanyPhoto ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${hasCompanyPhoto ? 'bg-green-500' : 'bg-amber-500'}`} />
                        <p className={`text-sm font-bold ${hasCompanyPhoto ? 'text-green-800' : 'text-amber-800'}`}>
                          {hasCompanyPhoto
                            ? (isEn ? 'Photo/logo uploaded' : 'Photo/logo téléchargé')
                            : (isEn ? 'Photo/logo missing' : 'Photo/logo manquant')}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 font-medium">
                        {isEn
                          ? 'Add a clean logo/photo to improve trust on listings and profile pages.'
                          : 'Ajoutez un logo/photo propre pour renforcer la confiance sur vos annonces et votre profil.'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-3 tracking-wider">
                        {isEn ? 'Company logo / profile photo' : 'Logo / photo entreprise'}
                      </label>

                      <div className="flex items-center gap-5">
                        <label className="relative cursor-pointer group flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-500 transition-all overflow-hidden shadow-sm">
                          {companyLogoPreview ? (
                            <Image src={companyLogoPreview} alt="Logo" width={112} height={112} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center text-gray-400 group-hover:text-blue-500 transition-colors">
                              <span className="text-2xl sm:text-3xl font-extrabold">{getInitials()}</span>
                              <span className="text-[10px] mt-1 font-bold uppercase tracking-wide">Upload</span>
                            </div>
                          )}

                          <input
                            type="file"
                            accept="image/jpeg, image/png, image/webp"
                            className="hidden"
                            onChange={(e) => {
                              handleCompanyLogoUpload(e.target.files?.[0] ?? null);
                              if (profileReviewStatus === 'approved') {
                                setProfileReviewStatus('not_submitted');
                              }
                            }}
                          />

                          {companyLogoPreview && (
                            <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center text-white text-xs font-bold transition-all backdrop-blur-sm">
                              {isEn ? 'Change' : 'Modifier'}
                            </div>
                          )}
                        </label>

                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900 mb-1">
                            {isEn ? 'Professional Logo' : 'Logo Professionnel'}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">
                            {isEn ? 'Format: JPG, PNG, WEBP. Max size: 5MB.' : 'Format: JPG, PNG, WEBP. Taille max: 5 Mo.'}
                          </p>
                          {companyLogoFile && (
                            <p className="mt-2 text-[11px] font-bold text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded-md">
                              {companyLogoFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ PLACEHOLDER VIEWS ═══ */}
            {activeSection === 'applications' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                      <h3 className="font-bold text-gray-900 text-[16px]">{isEn ? 'Applications Inbox' : 'Boîte de candidatures'}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{isEn ? 'Manage incoming applications and CVs' : 'Gérez les candidatures entrantes et les CV'}</p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 border-b border-gray-100">
                    <select
                      value={selectedMatchJobId || ''}
                      onChange={(e) => setSelectedMatchJobId(Number(e.target.value || 0))}
                      className="w-full p-3.5 border border-gray-200 rounded-xl bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="">{isEn ? 'Select a job listing...' : 'Sélectionnez une annonce...'}</option>
                      {authoredJobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          #{job.id} - {job.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white p-5 sm:p-6">
                    {applicationActionMessage && (
                      <p className={`mb-4 rounded-xl border px-4 py-3 text-sm font-bold ${applicationActionMessage.toLowerCase().includes('impossible') || applicationActionMessage.toLowerCase().includes('unable') ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        {applicationActionMessage}
                      </p>
                    )}
                    {!selectedMatchJobId ? (
                      <div className="text-center py-10">
                        <div className="text-4xl mb-3">{'\u{1F4C2}'}</div>
                        <p className="text-sm font-medium text-gray-500">
                          {isEn ? 'Please select a job listing above to view its applications.' : 'Veuillez sélectionner une annonce ci-dessus pour voir ses candidatures.'}
                        </p>
                      </div>
                    ) : isLoadingApplications ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin"></div>
                      </div>
                    ) : jobApplications.length === 0 ? (
                      <div className="text-center py-10 rounded-xl border border-dashed border-gray-200 bg-gray-50">
                        <p className="text-sm font-medium text-gray-500">
                          {isEn ? 'No applications received for this job yet.' : 'Aucune candidature reçue pour cette annonce pour le moment.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <h4 className="font-extrabold text-gray-900">{filteredJobApplications.length} {isEn ? 'Candidate(s)' : 'Candidat(s)'}</h4>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <select
                              value={applicationStatusFilter}
                              onChange={(event) => setApplicationStatusFilter(event.target.value as ApplicationStatusFilter)}
                              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {applyStatusFilterOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={matchCandidatesWithAi}
                              disabled={isMatchingCandidates}
                              className="text-xs font-bold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition flex items-center gap-1.5 disabled:opacity-50 border border-indigo-100"
                            >
                              {'\u2728'} {isMatchingCandidates ? (isEn ? 'Scoring...' : 'Scoring...') : (isEn ? 'Rank with AI' : "Classer avec l'IA")}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {applyStatusFilterOptions.map((option) => {
                            const isActive = applicationStatusFilter === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setApplicationStatusFilter(option.value)}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold transition ${applicationStatusChipClass[option.value]} ${isActive ? 'ring-2 ring-offset-1 ring-gray-300' : 'opacity-85 hover:opacity-100'}`}
                              >
                                <span>{option.label}</span>
                                <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] leading-none">
                                  {applicationStatusCounts[option.value]}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {filteredJobApplications.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                            <p className="text-sm font-medium text-gray-500">
                              {isEn ? 'No applications match this status.' : 'Aucune candidature pour ce statut.'}
                            </p>
                          </div>
                        ) : filteredJobApplications.map((app) => (
                          <div key={app.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:border-blue-300 transition-colors group">
                            <div className="p-5 flex flex-col sm:flex-row gap-5">
                              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                                {app.candidate.photoUrl ? (
                                  <Image src={app.candidate.photoUrl} alt={app.candidate.name} width={48} height={48} className="w-full h-full object-cover" />
                                ) : (
                                  app.candidate.name.charAt(0).toUpperCase()
                                )}
                              </div>

                              <div className="flex-1 min-w-0 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                                  <div>
                                    <div className="flex items-center gap-2.5">
                                      <h4 className="font-extrabold text-gray-900 text-base">{app.candidate.name}</h4>
                                      {(() => {
                                        const meta = applicationStatusUi(app.status);
                                        return (
                                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${meta.className}`}>
                                            {meta.label}
                                          </span>
                                        );
                                      })()}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs font-medium text-gray-500">
                                      <span className="flex items-center gap-1">{'\u2709\uFE0F'} {app.candidate.email}</span>
                                      {app.candidate.phone && <span className="flex items-center gap-1">{'\u{1F4DE}'} {app.candidate.phone}</span>}
                                      <span className="flex items-center gap-1 text-gray-400">{'\u{1F552}'} {new Date(app.createdAt).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}</span>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 self-start">
                                    <button
                                      type="button"
                                      onClick={() => handleApplicationStatusUpdate(app.id, 'REVIEWED')}
                                      disabled={applicationActionBusyId === app.id || app.status === 'REVIEWED'}
                                      className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-extrabold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                      title={isEn ? 'Mark as reviewed' : 'Marquer comme vue'}
                                    >
                                      {'\u{1F441}\uFE0F'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleApplicationStatusUpdate(app.id, 'ACCEPTED')}
                                      disabled={applicationActionBusyId === app.id || app.status === 'ACCEPTED'}
                                      className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                      title={isEn ? 'Accept candidate' : 'Accepter le candidat'}
                                    >
                                      {'\u2705'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPendingRejectApplicationId(app.id)}
                                      disabled={applicationActionBusyId === app.id || app.status === 'REJECTED'}
                                      className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-extrabold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                      title={isEn ? 'Reject candidate' : 'Refuser le candidat'}
                                    >
                                      {'\u274C'}
                                    </button>
                                    <a
                                      href={app.cvUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white transition shrink-0 self-start border border-blue-100 hover:border-blue-600"
                                    >
                                      {'\u{1F4C4}'} {isEn ? 'Download CV' : 'Télécharger le CV'}
                                    </a>
                                  </div>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-line border border-gray-100 relative">
                                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-2 tracking-wider">{isEn ? 'Cover Message' : 'Message de motivation'}</p>
                                  {app.message}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {pendingRejectApplicationId !== null ? (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">
                      <div className="border-b border-gray-100 px-5 py-4">
                        <h4 className="text-base font-extrabold text-gray-900">
                          {isEn ? 'Confirm rejection' : 'Confirmer le refus'}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600">
                          {isEn
                            ? 'This action will mark the application as rejected and notify the candidate.'
                            : 'Cette action marquera la candidature comme refusée et notifiera le candidat.'}
                        </p>
                      </div>
                      <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => setPendingRejectApplicationId(null)}
                          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                          {isEn ? 'Cancel' : 'Annuler'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const applicationId = pendingRejectApplicationId;
                            if (applicationId === null) return;
                            setPendingRejectApplicationId(null);
                            await handleApplicationStatusUpdate(applicationId, 'REJECTED');
                          }}
                          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
                        >
                          {isEn ? 'Confirm rejection' : 'Confirmer le refus'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {candidateMatches.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden p-5 sm:p-6 mt-6">
                    <h3 className="font-bold text-gray-900 text-[15px] mb-4">{'\u2728'} {isEn ? 'AI Shortlist' : "Shortlist générée par l'IA"}</h3>
                    {matchSource === 'gemini' && (
                      <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                        {isEn ? 'Scoring generated by Gemini.' : 'Scoring généré par Gemini.'}
                      </p>
                    )}
                    {matchSource === 'heuristic' && (
                      <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        {isEn ? 'Fallback scoring is currently active.' : 'Le scoring de secours est actuellement actif.'}
                      </p>
                    )}
                    {matchError && (
                      <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                        {matchError}
                      </p>
                    )}
                    <div className="space-y-3">
                      {candidateMatches.map((match) => (
                        <div key={match.candidateId} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-gray-900">
                              {isEn ? 'Candidate' : 'Candidat'} #{match.candidateId}
                            </p>
                            <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-extrabold text-indigo-700">
                              {match.score}%
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-gray-600">{match.explanation}</p>
                          {match.strengths.length > 0 && (
                            <p className="text-[11px] text-emerald-700 mt-2">
                              {isEn ? 'Strengths:' : 'Forces :'} {match.strengths.join(' | ')}
                            </p>
                          )}
                          {match.gaps.length > 0 && (
                            <p className="text-[11px] text-amber-700 mt-1">
                              {isEn ? 'Gaps:' : 'Écarts :'} {match.gaps.join(' | ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'interviews' && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      {isEn ? 'Applications to review' : 'Candidatures à traiter'}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-blue-900">{String(unreadNotifications).padStart(2, '0')}</p>
                    <p className="mt-2 text-xs font-medium text-blue-700">
                      {isEn ? 'Unread notifications in your employer inbox.' : 'Notifications non lues dans votre boîte entreprise.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      {isEn ? 'Qualified candidates detected' : 'Candidats détectés'}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-emerald-900">{String(detectedCandidateCount).padStart(2, '0')}</p>
                    <p className="mt-2 text-xs font-medium text-emerald-700">
                      {isEn ? 'Profiles extracted from incoming application activity.' : 'Profils détectés depuis les activités de candidature.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                      {isEn ? 'Open positions' : 'Postes ouverts'}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-amber-900">{String(approvedJobsCount + pendingJobsCount).padStart(2, '0')}</p>
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      {isEn
                        ? `${approvedJobsCount} live, ${pendingJobsCount} pending moderation.`
                        : `${approvedJobsCount} en ligne, ${pendingJobsCount} en modération.`}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                      <div>
                        <h3 className="text-[15px] font-bold text-gray-900">
                          {isEn ? 'Recruitment follow-up' : 'Suivi de recrutement'}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-gray-500">
                          {isEn ? 'Track the latest candidate actions tied to your listings.' : 'Suivez les dernières actions candidates liées à vos annonces.'}
                        </p>
                      </div>
                      <button
                        onClick={openApplications}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                      >
                        {isEn ? 'Open inbox' : 'Ouvrir la boîte'}
                      </button>
                    </div>

                    {recentApplicationNotifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-sm font-medium text-gray-500">
                          {isEn ? 'No candidate interactions recorded yet.' : 'Aucune interaction candidat enregistrée pour le moment.'}
                        </p>
                        <button
                          onClick={() => navigateTo('post')}
                          className="mt-4 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                        >
                          {isEn ? 'Publish a listing' : 'Publier une offre'}
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {recentApplicationNotifications.map((notification) => (
                          <div key={notification.id} className={`px-5 py-4 ${notification.isRead ? 'bg-white' : 'bg-blue-50/50'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-gray-900">{notification.title}</p>
                                <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                                <p className="mt-2 text-xs font-medium text-gray-400">
                                  {new Date(notification.createdAt).toLocaleString(isEn ? 'en-US' : 'fr-FR')}
                                </p>
                              </div>
                              {!notification.isRead && <span className="mt-2 h-2.5 w-2.5 rounded-full bg-red-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[15px] font-bold text-gray-900">
                          {isEn ? 'Shortlist assistant' : 'Assistant shortlist'}
                        </h3>
                        <p className="mt-1 text-xs font-medium text-gray-500">
                          {selectedMatchJob
                            ? (isEn ? `Working from: ${selectedMatchJob.title}` : `Base de travail : ${selectedMatchJob.title}`)
                            : (isEn ? 'Choose a listing to score candidates.' : 'Choisissez une annonce pour scorer les candidats.')}
                        </p>
                      </div>
                      <button
                        onClick={matchCandidatesWithAi}
                        disabled={isMatchingCandidates || authoredJobs.length === 0}
                        className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                      >
                        {isMatchingCandidates ? (isEn ? 'Scoring...' : 'Scoring...') : (isEn ? 'Refresh ranking' : 'Actualiser le classement')}
                      </button>
                    </div>

                    {topMatchedCandidates.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {topMatchedCandidates.map((match) => (
                          <div key={match.candidateId} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-bold text-gray-900">
                                {isEn ? 'Candidate' : 'Candidat'} #{match.candidateId}
                              </p>
                              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-extrabold text-indigo-700">
                                {match.score}%
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-gray-600">{match.explanation}</p>
                            <Link
                              href={localizePath(`/candidat/${match.candidateId}`)}
                              className="mt-3 inline-flex text-xs font-bold text-indigo-700 hover:text-indigo-800"
                            >
                              {isEn ? 'Open profile' : 'Ouvrir le profil'}
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5">
                        <p className="text-sm font-medium text-gray-600">
                          {isEn
                            ? 'No shortlist generated yet. Use your live applications to produce ranked candidates.'
                            : 'Aucune shortlist n’a encore été générée. Utilisez vos candidatures pour produire un classement exploitable.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'cvtheque' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">CVtheque</h3>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        {isEn
                          ? 'Search candidate profiles, then compare them with your open positions.'
                          : 'Explorez les profils candidats, puis comparez-les à vos postes ouverts.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={localizePath('/cvtheque')}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                      >
                        {isEn ? 'Open CVtheque' : 'Ouvrir la CVthèque'}
                      </Link>
                      <button
                        onClick={() => navigateTo('listings')}
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                      >
                        {isEn ? 'View listings' : 'Voir mes annonces'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                    <select
                      value={selectedMatchJobId || ''}
                      onChange={(e) => setSelectedMatchJobId(Number(e.target.value || 0))}
                      className="flex-1 rounded-xl border border-gray-200 bg-white p-3 text-sm"
                    >
                      <option value="">{isEn ? 'Select a listing to benchmark candidates' : 'Sélectionnez une annonce pour benchmarker les candidats'}</option>
                      {authoredJobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          #{job.id} - {job.title}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={matchCandidatesWithAi}
                      disabled={isMatchingCandidates || authoredJobs.length === 0}
                      className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {isMatchingCandidates
                        ? (isEn ? 'Generating ranking...' : 'Génération du classement...')
                        : (isEn ? 'Rank matching candidates' : 'Classer les candidats compatibles')}
                    </button>
                  </div>

                  {matchError && (
                    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                      {matchError}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {topMatchedCandidates.length > 0 ? topMatchedCandidates.map((match) => (
                    <div key={match.candidateId} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {isEn ? 'Candidate' : 'Candidat'} #{match.candidateId}
                          </p>
                          <p className="mt-1 text-xs font-medium text-gray-500">
                            {selectedMatchJob
                              ? (isEn ? `Compared with ${selectedMatchJob.title}` : `Comparé avec ${selectedMatchJob.title}`)
                              : (isEn ? 'Scored from your live applications' : 'Score depuis vos candidatures actives')}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                          {match.score}%
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-gray-600">{match.explanation}</p>

                      {match.strengths.length > 0 && (
                        <p className="mt-3 text-xs font-medium text-emerald-700">
                          {isEn ? 'Strengths:' : 'Forces :'} {match.strengths.join(' | ')}
                        </p>
                      )}
                      {match.gaps.length > 0 && (
                        <p className="mt-2 text-xs font-medium text-amber-700">
                          {isEn ? 'Gaps:' : 'Écarts :'} {match.gaps.join(' | ')}
                        </p>
                      )}

                      <Link
                        href={localizePath(`/candidat/${match.candidateId}`)}
                        className="mt-4 inline-flex rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                      >
                        {isEn ? 'Open candidate profile' : 'Ouvrir le profil candidat'}
                      </Link>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm font-medium text-gray-500 lg:col-span-2 xl:col-span-3">
                      {isEn
                        ? 'No ranked candidate yet. Publish a job, collect applications, then generate a shortlist here.'
                        : 'Aucun candidat classé pour le moment. Publiez une offre, récupérez des candidatures, puis générez une shortlist ici.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'billing' && (
              <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                    {isEn ? 'Current plan' : 'Plan actuel'}
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold text-gray-900">
                    {isEn ? 'Launch plan: 100% free' : 'Plan lancement : 100% gratuit'}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-gray-500">
                    {isEn
                      ? 'You can publish, manage applications, and prepare your company profile without waiting for billing activation.'
                      : 'Vous pouvez publier, gérer les candidatures et préparer votre profil entreprise sans attendre l’activation de la facturation.'}
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                        {isEn ? 'Published listings' : 'Annonces publiées'}
                      </p>
                      <p className="mt-2 text-3xl font-extrabold text-emerald-900">{String(publishedJobs.length).padStart(2, '0')}</p>
                    </div>
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                        {isEn ? 'Candidate leads' : 'Leads candidats'}
                      </p>
                      <p className="mt-2 text-3xl font-extrabold text-blue-900">{String(detectedCandidateCount).padStart(2, '0')}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                        {isEn ? 'Account status' : 'Statut du compte'}
                      </p>
                      <p className="mt-2 text-lg font-extrabold text-amber-900">
                        {isEnterpriseCertified ? (isEn ? 'Certified' : 'Certifié') : (isEn ? 'Pending setup' : 'Paramétrage en cours')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigateTo('post')}
                      className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                    >
                      {isEn ? 'Post a new job' : 'Publier une nouvelle offre'}
                    </button>
                    <button
                      onClick={() => navigateTo('profile')}
                      className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                    >
                      {isEn ? 'Complete company profile' : 'Compléter le profil entreprise'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {isEn ? 'Support and readiness' : 'Support et activation'}
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className={`rounded-2xl border p-4 ${isEnterpriseCertified ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                      <p className={`text-sm font-bold ${isEnterpriseCertified ? 'text-emerald-800' : 'text-amber-800'}`}>
                        {isEnterpriseCertified
                          ? (isEn ? 'Identity and trust checks passed.' : 'Vérification identité et confiance validée.')
                          : (isEn ? 'Finish profile setup to strengthen account trust.' : 'Terminez le profil pour renforcer la confiance du compte.')}
                      </p>
                    </div>

                    <div className={`rounded-2xl border p-4 ${hasCompanyPhoto ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
                      <p className={`text-sm font-bold ${hasCompanyPhoto ? 'text-blue-800' : 'text-red-800'}`}>
                        {hasCompanyPhoto
                          ? (isEn ? 'Logo uploaded and visible on profile.' : 'Logo téléchargé et visible sur le profil.')
                          : (isEn ? 'Logo still missing for public trust pages.' : 'Logo encore manquant pour les pages publiques de confiance.')}
                      </p>
                    </div>

                    <a
                      href="mailto:contact@bolo237.com?subject=Support%20Entreprise%20Bolo237"
                      className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 transition hover:bg-gray-100"
                    >
                      <span>
                        <span className="block text-sm font-bold text-gray-900">contact@bolo237.com</span>
                        <span className="mt-1 block text-xs font-medium text-gray-500">
                          {isEn ? 'Reach support for onboarding, verification, or account questions.' : 'Contactez le support pour onboarding, vérification ou questions de compte.'}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-indigo-700">{isEn ? 'Write' : 'Écrire'}</span>
                    </a>
                  </div>
                </div>
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
            { key: 'applications' as SidebarSection, icon: '\u{1F465}', label: isEn ? 'Inbox' : 'Boîte' },
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

export default function DashboardEntreprise() {
  return (
    <Suspense fallback={null}>
      <DashboardEntrepriseContent />
    </Suspense>
  );
}
