"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { createCandidateProfile, fetchSessionUser, fetchUserSavedJobs, fetchUserApplications, fetchUserProfile, logoutUser, updateUserPhoto, uploadFile, upsertUserProfile, ApiError, type ApiJob, type CandidateProfile, type UserApplication, type UserProfile } from '@/lib/api';
import { buildJobDetailPath } from '@/lib/jobSlug';
import { clearStoredSession, getStoredUser, hasRecentAuthSuccess, mergeStoredUser, persistPhotoUrl } from '@/lib/session';
import { useRequireRole } from '@/lib/useRequireRole';

type CvFormData = {
  fullName: string;
  title: string;
  location: string;
  phone: string;
  email: string;
  profile: string;
  experience: string;
  education: string;
  skillsText: string;
  languagesText: string;
};

export default function DashboardCandidat() {
  const { locale, localizePath } = useLocale();
  const router = useRouter();
  const isEn = locale === 'en';
  useRequireRole('CANDIDAT');
  const availabilityOptions: CandidateProfile['disponibilite'][] = ['Immediatement', 'Sous 1 mois', 'A l ecoute du marche'];
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<number>(0);
  const [isVerified, setIsVerified] = useState(false);
  const [savedJobs, setSavedJobs] = useState<ApiJob[]>([]);
  const [candidatures, setCandidatures] = useState<UserApplication[]>([]);
  const [profileVisible, setProfileVisible] = useState(true);
  const [availability, setAvailability] = useState<CandidateProfile['disponibilite']>('Immediatement');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [cvBuilderOpen, setCvBuilderOpen] = useState(false);
  const [cvBuilderStep, setCvBuilderStep] = useState<1 | 2>(1);
  const [cvLanguage, setCvLanguage] = useState<'FR' | 'EN'>('FR');
  const [cvTemplate, setCvTemplate] = useState<
    'fr_classique_cm' | 'fr_moderne_cm' | 'en_professional_cm' | 'en_international_cm'
  >('fr_moderne_cm');
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<'infos' | 'resume' | 'exp' | 'edu' | 'skills'>('infos');
  const [isSavingCv, setIsSavingCv] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isOptimizingCv, setIsOptimizingCv] = useState(false);
  const [cvActionMessage, setCvActionMessage] = useState('');
  const [aiDraft, setAiDraft] = useState<CvFormData | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const cvFileInputRef = useRef<HTMLInputElement | null>(null);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<{ name: string; url: string; type: string; uploadedAt: string }[]>([]);
  const [defaultCvUrl, setDefaultCvUrl] = useState('');
  const [jobAlertRole, setJobAlertRole] = useState('');
  const [jobAlertCity, setJobAlertCity] = useState('');
  const [isSavingProfileSection, setIsSavingProfileSection] = useState(false);
  const [profileSectionMessage, setProfileSectionMessage] = useState('');
  const [isSavingJobAlert, setIsSavingJobAlert] = useState(false);
  const [jobAlertMessage, setJobAlertMessage] = useState('');
  const [cvData, setCvData] = useState<CvFormData>({
    fullName: '',
    title: '',
    location: '',
    phone: '',
    email: '',
    profile: '',
    experience: '',
    education: '',
    skillsText: '',
    languagesText: '',
  });

  useEffect(() => {
    try {
      const docsRaw = localStorage.getItem('bolo237-documents');
      if (docsRaw) {
        setUploadedDocuments(JSON.parse(docsRaw));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Redirection cross-rôle gérée par useRequireRole('CANDIDAT') ci-dessus.
    try {
      const raw = localStorage.getItem('bolo237-user');
      if (raw) {
        const parsed = JSON.parse(raw);
        setUserName(parsed?.name || parsed?.fullName || parsed?.nom || '');
        setUserId(Number(parsed?.id || 0));
        setProfilePhotoUrl(String(parsed?.photoUrl || ''));
        setIsVerified(Boolean(parsed?.isVerified));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    const loadSavedJobs = async () => {
      if (!userId) return;
      try {
        const jobs = await fetchUserSavedJobs(userId);
        setSavedJobs(jobs);
      } catch {
        setSavedJobs([]);
      }
    };

    loadSavedJobs();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const loadApplications = async () => {
      try {
        const apps = await fetchUserApplications(userId);
        if (!active) return;
        setCandidatures(apps);
      } catch {
        if (!active) return;
        setCandidatures([]);
      }
    };

    const start = () => {
      if (timer) return;
      loadApplications();
      timer = setInterval(loadApplications, 20000);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      start();
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      active = false;
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const loadProfile = async () => {
      try {
        const profile = await fetchUserProfile(userId);
        setCvData({
          fullName: profile.fullName || '',
          title: profile.title || '',
          location: profile.location || '',
          phone: profile.phone || '',
          email: profile.email || '',
          profile: profile.profile || '',
          experience: profile.experience || '',
          education: profile.education || '',
          skillsText: profile.skillsText || '',
          languagesText: profile.languagesText || '',
        });
        setAvailability((profile.availability as CandidateProfile['disponibilite']) || 'Immediatement');
        setProfileVisible(profile.profileVisible ?? true);
        setJobAlertRole(profile.jobAlertRole || '');
        setJobAlertCity(profile.jobAlertCity || '');
        setDefaultCvUrl(profile.defaultCvUrl || '');

        if (profile.defaultCvUrl) {
          setUploadedDocuments((prev) => {
            const hasSameCv = prev.some((document) => document.type === 'cv' && document.url === profile.defaultCvUrl);
            if (hasSameCv) return prev;

            const next = [
              { name: 'CV principal', url: profile.defaultCvUrl, type: 'cv', uploadedAt: new Date().toISOString() },
              ...prev.filter((document) => document.type !== 'cv'),
            ];

            if (typeof window !== 'undefined') {
              window.localStorage.setItem('bolo237-documents', JSON.stringify(next));
            }

            return next;
          });
        }
      } catch {
        // ignore missing profile until first save
      }
    };

    loadProfile();
  }, [userId]);

  const normalizeSkills = (value: string) => value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  useEffect(() => {
    setSkills(normalizeSkills(cvData.skillsText));
  }, [cvData.skillsText]);

  useEffect(() => {
    const ensureActiveUser = async () => {
      if (!userId) return;
      const storedUser = getStoredUser();
      const recentAuth = hasRecentAuthSuccess();
      const maxAttempts = recentAuth ? 4 : 2;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 700 * attempt));
        } else {
          await new Promise((r) => setTimeout(r, 500));
        }

        try {
          const sessionUser = await fetchSessionUser({ captureServerErrors: false });
          const sessionRole = String(sessionUser.role || '').toUpperCase();
          if (sessionRole === 'ENTREPRISE') {
            mergeStoredUser(sessionUser as unknown as Record<string, unknown>);
            window.location.href = localizePath('/dashboard-entreprise');
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

          mergeStoredUser(sessionUser as unknown as Record<string, unknown>);
          if (Number(sessionUser.id) && Number(sessionUser.id) !== Number(userId)) {
            setUserId(Number(sessionUser.id));
          }
          if (sessionUser.name) {
            setUserName(String(sessionUser.name));
          }
          setIsVerified(Boolean(sessionUser.isVerified));
          return;
        } catch (err) {
          const status = err instanceof ApiError ? err.status : 0;
          // Keep user on page for transient backend/network issues.
          if (status !== 401 && status !== 403) return;
        }
      }

      if (storedUser?.id) {
        return;
      }

      await logoutUser().catch(() => undefined);
      clearStoredSession();
      window.location.href = localizePath('/');
    };

    ensureActiveUser();
  }, [userId, localizePath]);

  const emploisSauvegardes = useMemo<{ id: number; titre: string; entreprise: string; lieu: string; type: string; temps: string }[]>(
    () => savedJobs.map((job) => {
      const diff = Date.now() - new Date(job.createdAt).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const temps = hours < 1
        ? "A l instant"
        : hours < 24
          ? `Il y a ${hours}h`
          : `Il y a ${Math.floor(hours / 24)} jour${Math.floor(hours / 24) > 1 ? 's' : ''}`;

      return {
        id: job.id,
        titre: job.title,
        entreprise: job.company,
        lieu: job.location,
        type: 'CDI',
        temps,
      };
    }),
    [savedJobs],
  );

  const addSkill = () => {
    const value = skillInput.trim();
    const nextSkills = normalizeSkills(cvData.skillsText);
    if (!value || nextSkills.includes(value)) return;
    updateCvData('skillsText', [...nextSkills, value].join(', '));
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    updateCvData('skillsText', skills.filter((item) => item !== skill).join(', '));
  };

  const statusClass = (status: string) => {
    if (status === 'En attente') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (status === 'Vue par l employeur') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'Refusee') return 'bg-red-50 text-red-700 border-red-200';
    if (status === 'Acceptee') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'En attente d entretien') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  const templates = [
    {
      id: 'fr_classique_cm',
      lang: 'FR',
      name: 'Francais Classique (CM)',
      note: 'Format traditionnel francophone, parfait pour administration, finance et comptabilite au Cameroun.',
    },
    {
      id: 'fr_moderne_cm',
      lang: 'FR',
      name: 'Francais Moderne (CM)',
      note: 'Structure claire avec accent local Bolo237, ideal tertiaire et entreprises privees.',
    },
    {
      id: 'en_professional_cm',
      lang: 'EN',
      name: 'English Professional (CM)',
      note: 'Business style aligned with Anglophone hiring in Cameroon (Buea, Bamenda, Douala).',
    },
    {
      id: 'en_international_cm',
      lang: 'EN',
      name: 'English International (CM)',
      note: 'Clean international format adapted for Cameroon profiles and cross-border opportunities.',
    },
  ] as const;

  const templatesByLanguage = {
    FR: ['fr_classique_cm', 'fr_moderne_cm'],
    EN: ['en_professional_cm', 'en_international_cm'],
  } as const;

  const filteredTemplates = templates.filter((template) => template.lang === cvLanguage);

  const labels = {
    FR: {
      profile: 'Resume',
      experience: 'Experiences professionnelles',
      education: 'Formations & Diplomes',
      skills: 'Competences',
      languages: 'Langues',
    },
    EN: {
      profile: 'Profile',
      experience: 'Experience',
      education: 'Education',
      skills: 'Skills',
      languages: 'Languages',
    },
  } as const;

  const builderText = {
    FR: {
      requiredNameTitle: 'Renseignez au minimum le nom et le titre avant de sauvegarder.',
      saveSuccess: 'Dossier candidat enregistre et applique au profil. Il est aussi visible dans la CVtheque.',
      saveError: 'Erreur de sauvegarde. Verifiez votre connexion puis reessayez.',
      pdfBrowserOnly: 'PDF disponible uniquement dans le navigateur.',
      pdfMissing: 'jsPDF introuvable dans le bundle navigateur.',
      pdfSuccess: 'PDF genere et telecharge avec succes.',
      pdfError: 'Erreur lors de la generation du PDF.',
      fullNameFallback: 'Nom complet',
      profileTitleFallback: 'Titre du profil',
      profileFallback: 'Ajoutez un resume professionnel.',
      experienceFallback: 'Ajoutez vos experiences.',
      educationFallback: 'Ajoutez vos formations.',
      skillsFallback: 'Ajoutez vos competences.',
      languagesFallback: 'Ajoutez vos langues.',
      modelChoiceLabel: 'Choix du modele (type francais) adapte au Cameroun',
      step2Title: 'Etape 2 : Editeur CV Split-Screen',
      accordionInfos: 'Infos personnelles',
      accordionResume: 'Resume / Profil',
      accordionExp: 'Experiences professionnelles',
      accordionEdu: 'Formations & Diplomes',
      accordionSkills: 'Competences & Langues',
      placeholderFullName: 'Nom complet',
      placeholderTitle: 'Titre',
      placeholderLocation: 'Localisation',
      placeholderPhone: 'Telephone',
      placeholderEmail: 'Email',
      addPhoto: 'Ajouter une photo',
      placeholderIntro: 'Votre texte d introduction',
      placeholderExp: 'Poste, Entreprise, Dates, Missions',
      placeholderEdu: 'Formations et diplomes',
      placeholderSkills: 'Competences',
      placeholderLanguages: 'Langues',
      mobilePreview: 'Apercu du CV',
      close: 'Fermer',
      saving: 'Enregistrement...',
      saveApply: 'Enregistrer mon dossier candidat',
      generating: 'Generation...',
      downloadPdf: 'Telecharger en PDF',
      continueEditor: 'Continuer vers l editeur',
      aiOptimize: 'Optimiser avec l IA',
      aiOptimizing: 'L IA analyse votre profil...',
      aiApplyDraft: 'Appliquer cette version',
      aiDraftReady: 'Suggestion IA prete. Relisez puis appliquez.',
      aiOptimizeError: 'Optimisation IA indisponible pour le moment.',
    },
    EN: {
      requiredNameTitle: 'Please enter at least full name and job title before saving.',
      saveSuccess: 'Candidate file saved and applied to your profile. It is now visible in the CV database.',
      saveError: 'Save failed. Please check your connection and try again.',
      pdfBrowserOnly: 'PDF is available only in browser mode.',
      pdfMissing: 'jsPDF not found in browser bundle.',
      pdfSuccess: 'PDF generated and downloaded successfully.',
      pdfError: 'Error while generating PDF.',
      fullNameFallback: 'Full name',
      profileTitleFallback: 'Professional headline',
      profileFallback: 'Add your professional summary.',
      experienceFallback: 'Add your work experience.',
      educationFallback: 'Add your education.',
      skillsFallback: 'Add your skills.',
      languagesFallback: 'Add your languages.',
      modelChoiceLabel: 'Template choice (English style) adapted to Cameroon',
      step2Title: 'Step 2: Split-Screen CV Editor',
      accordionInfos: 'Personal details',
      accordionResume: 'Summary / Profile',
      accordionExp: 'Work experience',
      accordionEdu: 'Education & Degrees',
      accordionSkills: 'Skills & Languages',
      placeholderFullName: 'Full name',
      placeholderTitle: 'Headline',
      placeholderLocation: 'Location',
      placeholderPhone: 'Phone',
      placeholderEmail: 'Email',
      addPhoto: 'Add a photo',
      placeholderIntro: 'Write a short professional introduction',
      placeholderExp: 'Role, Company, Dates, Achievements',
      placeholderEdu: 'Degrees, schools, years',
      placeholderSkills: 'Skills',
      placeholderLanguages: 'Languages',
      mobilePreview: 'CV Preview',
      close: 'Close',
      saving: 'Saving...',
      saveApply: 'Save my candidate file',
      generating: 'Generating...',
      downloadPdf: 'Download PDF',
      continueEditor: 'Continue to editor',
      aiOptimize: 'Optimize with AI',
      aiOptimizing: 'AI is analyzing your profile...',
      aiApplyDraft: 'Apply this version',
      aiDraftReady: 'AI draft ready. Review then apply.',
      aiOptimizeError: 'AI optimization is currently unavailable.',
    },
  } as const;

  const previewTheme =
    cvTemplate === 'fr_classique_cm' || cvTemplate === 'en_professional_cm'
      ? 'border-gray-300'
      : cvTemplate === 'fr_moderne_cm'
        ? 'border-green-300 shadow-[0_0_0_1px_rgba(22,163,74,0.12)]'
        : 'border-slate-200';

  const previewHeader =
    cvTemplate === 'fr_classique_cm' || cvTemplate === 'en_professional_cm'
      ? 'bg-gray-100 text-gray-900'
      : cvTemplate === 'fr_moderne_cm'
        ? 'bg-green-600 text-white'
        : 'bg-slate-100 text-slate-900';

  const sectionLabel = labels[cvLanguage];
  const t = builderText[cvLanguage];

  const handleLanguageSwitch = (language: 'FR' | 'EN') => {
    setCvLanguage(language);
    const availableTemplates = templatesByLanguage[language];
    if (!availableTemplates.some((templateId) => templateId === cvTemplate)) {
      setCvTemplate(availableTemplates[0]);
    }
  };

  const updateCvData = (key: keyof typeof cvData, value: string) => {
    setCvData((prev) => ({ ...prev, [key]: value }));
  };

  const buildUserProfilePayload = (): Omit<UserProfile, 'userId' | 'updatedAt'> => {
    const displayName = cvData.fullName.trim() || userName.trim() || (isEn ? 'Candidate' : 'Candidat');

    return {
      fullName: displayName,
      title: cvData.title,
      location: cvData.location,
      availability,
      profileVisible,
      jobAlertRole,
      jobAlertCity,
      phone: cvData.phone,
      email: cvData.email,
      profile: cvData.profile,
      defaultCvUrl,
      experience: cvData.experience,
      education: cvData.education,
      skillsText: cvData.skillsText,
      languagesText: cvData.languagesText,
    };
  };

  const buildCandidateProfilePayload = () => {
    const displayName = cvData.fullName.trim() || userName.trim() || (isEn ? 'Candidate' : 'Candidat');

    return {
      userId: userId || undefined,
      nom: displayName,
      titre: cvData.title,
      localisation: cvData.location.split(',')[0]?.trim() || 'Douala',
      experience: 'Confirme' as CandidateProfile['experience'],
      disponibilite: availability,
      etudes: 'Bac+3' as CandidateProfile['etudes'],
      competences: normalizeSkills(cvData.skillsText).slice(0, 8),
      disponibleNow: profileVisible,
    };
  };

  const updateStoredCandidateSnapshot = () => {
    const storedUser = getStoredUser();
    const phoneVerified = typeof window !== 'undefined' && window.localStorage.getItem('bolo237-phone-verified') === 'true';
    const profileComplete = Boolean(
      cvData.fullName.trim() &&
      cvData.title.trim() &&
      cvData.location.trim() &&
      cvData.phone.trim() &&
      cvData.email.trim() &&
      (cvData.profile.trim() || cvData.experience.trim() || cvData.education.trim()) &&
      cvData.skillsText.trim()
    );
    const displayName = cvData.fullName.trim() || userName.trim() || (isEn ? 'Candidate' : 'Candidat');

    mergeStoredUser({
      ...(storedUser || {}),
      name: displayName,
      title: cvData.title,
      phone: cvData.phone,
      skills: cvData.skillsText,
      photoUrl: profilePhotoUrl,
      cvUploaded: Boolean(defaultCvUrl || uploadedDocuments.some((document) => document.type === 'cv')),
      phoneVerified,
      profileComplete,
      profileVisible,
      jobAlertRole,
      jobAlertCity,
    });
    setUserName(displayName);
  };

  const completionChecks = [
    Boolean(cvData.fullName.trim()),
    Boolean(cvData.title.trim()),
    Boolean(cvData.location.trim()),
    Boolean(cvData.phone.trim()),
    Boolean(cvData.email.trim()),
    Boolean(cvData.profile.trim()),
    Boolean(cvData.experience.trim()),
    Boolean(cvData.education.trim()),
    Boolean(cvData.skillsText.trim()),
    Boolean(cvData.languagesText.trim()),
  ];
  const completionPercent = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);
  const recommendationItems = [
    !cvData.profile.trim() && (isEn ? 'Write a 3-line summary focused on your strongest value.' : 'Ajoutez un resume en 3 lignes oriente resultats.'),
    !cvData.experience.trim() && (isEn ? 'Describe one concrete mission with tools and outcomes.' : 'Decrivez au moins une mission concrete avec outils et resultats.'),
    !cvData.skillsText.trim() && (isEn ? 'List 6 to 8 practical skills recruiters search for.' : 'Listez 6 a 8 competences pratiques recherchees.'),
  ].filter(Boolean) as string[];

  const handleSaveProfileSection = async () => {
    if (!userId) {
      setProfileSectionMessage(isEn ? 'Session not found. Please sign in again.' : 'Session introuvable. Veuillez vous reconnecter.');
      return;
    }

    if (!cvData.title.trim() || !cvData.location.trim()) {
      setProfileSectionMessage(isEn ? 'Fill in your title and location first.' : 'Renseignez d abord votre titre et votre localisation.');
      return;
    }

    setIsSavingProfileSection(true);
    setProfileSectionMessage('');

    try {
      await upsertUserProfile(userId, buildUserProfilePayload());
      if (cvData.title.trim()) {
        await createCandidateProfile(buildCandidateProfilePayload());
      }
      updateStoredCandidateSnapshot();
      setProfileSectionMessage(isEn ? 'Profile essentials saved.' : 'Elements du profil enregistres.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setProfileSectionMessage(isEn ? `Unable to save profile: ${message}` : `Impossible d enregistrer le profil : ${message}`);
    } finally {
      setIsSavingProfileSection(false);
    }
  };

  const handleSaveJobAlert = async () => {
    if (!userId) {
      setJobAlertMessage(isEn ? 'Session not found. Please sign in again.' : 'Session introuvable. Veuillez vous reconnecter.');
      return;
    }

    if (!jobAlertRole.trim() && !jobAlertCity.trim()) {
      setJobAlertMessage(isEn ? 'Enter at least a role or a city.' : 'Renseignez au moins un metier ou une ville.');
      return;
    }

    setIsSavingJobAlert(true);
    setJobAlertMessage('');

    try {
      await upsertUserProfile(userId, buildUserProfilePayload());
      updateStoredCandidateSnapshot();
      setJobAlertMessage(isEn ? 'Job alert saved to your profile.' : 'Alerte emploi enregistree sur votre profil.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setJobAlertMessage(isEn ? `Unable to save the alert: ${message}` : `Impossible d enregistrer l alerte : ${message}`);
    } finally {
      setIsSavingJobAlert(false);
    }
  };

  const handleCvFileUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingCv(true);
    setCvActionMessage('');
    try {
      const uploaded = await uploadFile(file, 'cv');
      const doc = { name: file.name, url: uploaded.url, type: 'cv', uploadedAt: new Date().toISOString() };
      const next = [doc, ...uploadedDocuments.filter((d) => d.type !== 'cv')];
      setUploadedDocuments(next);
      localStorage.setItem('bolo237-documents', JSON.stringify(next));
      setDefaultCvUrl(uploaded.url);

      if (userId) {
        const basePayload = buildUserProfilePayload();
        await upsertUserProfile(userId, { ...basePayload, defaultCvUrl: uploaded.url });
      }

      mergeStoredUser({ cvUploaded: true });
      setCvActionMessage(isEn ? 'CV uploaded successfully.' : 'CV telecharge avec succes.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setCvActionMessage((isEn ? 'CV upload failed: ' : 'Echec telechargement CV: ') + message);
    } finally {
      setIsUploadingCv(false);
    }
  };

  const handleDocumentUpload = async (file: File | null) => {
    if (!file) return;
    setCvActionMessage('');
    try {
      const uploaded = await uploadFile(file, 'candidate-documents');
      const doc = { name: file.name, url: uploaded.url, type: 'document', uploadedAt: new Date().toISOString() };
      const next = [...uploadedDocuments, doc];
      setUploadedDocuments(next);
      localStorage.setItem('bolo237-documents', JSON.stringify(next));
      setCvActionMessage(isEn ? 'Document uploaded successfully.' : 'Document telecharge avec succes.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setCvActionMessage((isEn ? 'Document upload failed: ' : 'Echec telechargement: ') + message);
    }
  };

  const handleRemoveDocument = (index: number) => {
    const removed = uploadedDocuments[index];
    const next = uploadedDocuments.filter((_, i) => i !== index);
    setUploadedDocuments(next);
    localStorage.setItem('bolo237-documents', JSON.stringify(next));

    if (removed?.type === 'cv') {
      setDefaultCvUrl('');
      if (userId) {
        void upsertUserProfile(userId, { ...buildUserProfilePayload(), defaultCvUrl: '' }).catch(() => undefined);
      }
    }
  };

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    setCvActionMessage('');
    try {
      const uploaded = await uploadFile(file, 'avatars');

      if (userId) {
        await updateUserPhoto(userId, uploaded.url);
      }

      setProfilePhotoUrl(uploaded.url);
      mergeStoredUser({ photoUrl: uploaded.url });
      persistPhotoUrl('photoUrl', uploaded.url);
      setCvActionMessage(isEn ? 'Photo uploaded successfully.' : 'Photo telechargee avec succes.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setCvActionMessage((isEn ? 'Photo upload failed: ' : 'Echec du telechargement photo: ') + message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleOptimizeWithAi = async () => {
    setIsOptimizingCv(true);
    setCvActionMessage('');

    try {
      const response = await fetch('/api/ai/cv-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: cvLanguage,
          role: 'candidate',
          cvData,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        optimized?: CvFormData;
      };

      if (!response.ok || !payload?.success || !payload.optimized) {
        throw new Error(payload?.message || t.aiOptimizeError);
      }

      setAiDraft(payload.optimized);
      setCvActionMessage(t.aiDraftReady);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.aiOptimizeError;
      setCvActionMessage(message);
    } finally {
      setIsOptimizingCv(false);
    }
  };

  const handleApplyAiDraft = () => {
    if (!aiDraft) return;
    setCvData(aiDraft);
    setAiDraft(null);
    setCvActionMessage(isEn ? 'AI version applied to your editor.' : 'Version IA appliquee dans votre editeur.');
  };

  const handleSaveAndApply = async () => {
    if (!cvData.fullName.trim() || !cvData.title.trim()) {
      setCvActionMessage(t.requiredNameTitle);
      return;
    }

    setIsSavingCv(true);
    setCvActionMessage('');

    try {
      await createCandidateProfile(buildCandidateProfilePayload());

      if (userId) {
        await upsertUserProfile(userId, buildUserProfilePayload());
      }

      updateStoredCandidateSnapshot();

      setCvActionMessage(t.saveSuccess);
    } catch {
      setCvActionMessage(t.saveError);
    } finally {
      setIsSavingCv(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setCvActionMessage('');

    try {
      if (typeof window === 'undefined') {
        throw new Error(t.pdfBrowserOnly);
      }

      const jspdfModule = await import('jspdf/dist/jspdf.umd.min.js');
      const jsPDF =
        (jspdfModule as { jsPDF?: new (options?: { unit?: string; format?: string }) => {
          internal: { pageSize: { getWidth: () => number } };
          setFont: (family: string, style: string) => void;
          setFontSize: (size: number) => void;
          text: (text: string | string[], x: number, y: number) => void;
          splitTextToSize: (text: string, size: number) => string[];
          save: (filename: string) => void;
        } }).jsPDF;

      if (!jsPDF) {
        throw new Error(t.pdfMissing);
      }

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 44;
      let y = 50;

      const addTitle = (value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(value, margin, y);
        y += 16;
      };

      const addParagraph = (value: string) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10.5);
        const lines = doc.splitTextToSize(value || '-', pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 13 + 8;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(cvData.fullName || t.fullNameFallback, margin, y);
      y += 20;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(cvData.title || t.profileTitleFallback, margin, y);
      y += 16;

      doc.setFontSize(10);
      doc.text(`${cvData.location} | ${cvData.phone}`, margin, y);
      y += 24;

      addTitle(sectionLabel.profile);
      addParagraph(cvData.profile);

      addTitle(sectionLabel.experience);
      addParagraph(cvData.experience);

      addTitle(sectionLabel.education);
      addParagraph(cvData.education);

      addTitle(sectionLabel.skills);
      addParagraph(cvData.skillsText);

      addTitle(sectionLabel.languages);
      addParagraph(cvData.languagesText);

      const safeName = (cvData.fullName || 'candidat').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      doc.save(`CV_${safeName}.pdf`);
      setCvActionMessage(t.pdfSuccess);
    } catch {
      setCvActionMessage(t.pdfError);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const renderCvPreview = () => (
    <div className={`bg-white rounded-[24px] border ${previewTheme} w-full max-w-[740px] aspect-[1/1.414] mx-auto overflow-hidden shadow-[0_24px_80px_rgba(15,23,42,0.12)]`}>
      <div className={`px-6 py-5 ${previewHeader}`}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/90 border border-white/50 flex items-center justify-center text-2xl font-black text-slate-800 shrink-0 shadow-sm drop-shadow-sm">
            {candidateInitials}
          </div>
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">{candidateDisplayName}</h3>
            <p className="text-sm font-semibold mt-1">{cvData.title || t.profileTitleFallback}</p>
            <p className="text-xs opacity-90 mt-2">{cvData.location} • {cvData.phone}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4 text-[12.5px] leading-5 text-gray-800 bg-gradient-to-b from-white via-white to-emerald-50/40">
        <section>
          <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 mb-1">{sectionLabel.profile}</h4>
          <p>{cvData.profile || t.profileFallback}</p>
        </section>

        <section>
          <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 mb-1">{sectionLabel.experience}</h4>
          <p className="whitespace-pre-line">{cvData.experience || t.experienceFallback}</p>
        </section>

        <section>
          <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 mb-1">{sectionLabel.education}</h4>
          <p className="whitespace-pre-line">{cvData.education || t.educationFallback}</p>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 mb-1">{sectionLabel.skills}</h4>
            <p>{cvData.skillsText || t.skillsFallback}</p>
          </div>
          <div>
            <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-gray-500 mb-1">{sectionLabel.languages}</h4>
            <p>{cvData.languagesText || t.languagesFallback}</p>
          </div>
        </section>
      </div>
    </div>
  );

  /* ── helper pour les initiales ── */
  const getInitials = (name: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const candidateDisplayName = cvData.fullName.trim() || userName.trim() || (isEn ? 'Candidate' : 'Candidat');
  const candidateInitials = getInitials(candidateDisplayName);

  /* ── input class helper ── */
  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-base sm:text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition appearance-none';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100/80 text-black flex flex-col">
      <Header />

      <main className="max-w-[1200px] mx-auto w-full px-3 sm:px-4 lg:px-6 py-6 sm:py-8 md:py-10 space-y-5 sm:space-y-6 md:space-y-8 grow">

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-extrabold text-gray-700 hover:border-green-300 hover:text-green-700 transition"
          >
            <span aria-hidden="true">←</span>
            {isEn ? 'Back' : 'Retour'}
          </button>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-500 border border-gray-200">
            {completionPercent}% {isEn ? 'complete' : 'complet'}
          </span>
        </div>

        <div className="mb-8 space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:flex lg:items-center lg:gap-8 lg:space-y-0 relative overflow-hidden">
          <div className="flex items-center gap-5 lg:w-1/3">
            <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shadow-sm">
              <span className="text-3xl sm:text-4xl text-blue-700 font-black tracking-widest drop-shadow-sm">
                {candidateInitials}
              </span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight flex items-center gap-2">
                {candidateDisplayName}
                {isVerified && (
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full text-xs shadow-sm" title={isEn ? 'Verified' : 'Verifie'}>✓</span>
                )}
              </h1>
              <p className="text-sm font-bold text-gray-500 mt-1">{cvData.title || (isEn ? 'Job title not set' : 'Titre non renseigne')}</p>
              <Link href={localizePath('/profil')} className="inline-block mt-2 text-xs font-extrabold text-blue-600 hover:text-blue-700">
                {isEn ? 'Edit profile →' : 'Modifier le profil →'}
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 lg:w-1/3">
            <div className="mb-2 flex items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">{isEn ? 'Profile completion' : 'Completion du profil'}</h3>
                <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-gray-500">
                  {recommendationItems[0] || (isEn ? 'Profile ready to apply.' : 'Profil pret pour postuler.')}
                </p>
              </div>
              <span className="text-lg font-black text-green-600">{completionPercent}%</span>
            </div>
            <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-green-500 transition-all duration-700" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>

          <div className="grid w-full grid-cols-3 gap-3 lg:w-1/3">
            <div className="group rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm transition hover:border-blue-300">
              <p className="text-2xl font-black text-blue-600 transition-transform group-hover:scale-110">{candidatures.length}</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase text-gray-500">{isEn ? 'Applications' : 'Candidatures'}</p>
            </div>
            <div className="group rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm transition hover:border-amber-300">
              <p className="text-2xl font-black text-amber-500 transition-transform group-hover:scale-110">{savedJobs.length}</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase text-gray-500">{isEn ? 'Saved' : 'Sauvegardes'}</p>
            </div>
            <div className="group rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm transition hover:border-purple-300">
              <p className="text-2xl font-black text-purple-600 transition-transform group-hover:scale-110">0</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase text-gray-500">{isEn ? 'Profile views' : 'Vues profil'}</p>
            </div>
          </div>
        </div>

        {/* ════════════ PROFILE / CV SECTION ════════════ */}
        <section className="bg-white rounded-2xl shadow-sm shadow-gray-200/60 p-5 sm:p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold flex items-center gap-2">
              <span role="img" aria-label="person">&#128100;</span>
              {isEn ? 'My Profile / My CV' : 'Mon Profil / Mon CV'}
            </h2>
            <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-600">
              <span>{isEn ? 'Visible in CV database' : 'Visible dans la CVtheque'}</span>
              <button
                onClick={() => setProfileVisible(!profileVisible)}
                className={`w-12 h-7 sm:w-14 sm:h-8 rounded-full p-0.5 sm:p-1 transition-colors duration-200 ${profileVisible ? 'bg-green-600' : 'bg-gray-300'}`}
                role="switch"
                aria-checked={profileVisible}
              >
                <span className={`block w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${profileVisible ? 'translate-x-5 sm:translate-x-6' : ''}`} />
              </button>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={cvData.title} onChange={(e) => updateCvData('title', e.target.value)} className={`sm:col-span-2 ${inputCls}`} placeholder={isEn ? 'Profile title (ex: Marketing Project Manager)' : 'Titre du profil (ex: Chef de projet Marketing)'} />
            <input value={cvData.location} onChange={(e) => updateCvData('location', e.target.value)} className={inputCls} placeholder={isEn ? 'Location' : 'Localisation'} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <select value={availability} onChange={(e) => setAvailability(e.target.value as CandidateProfile['disponibilite'])} className={inputCls}>
              {availabilityOptions.map((option) => (
                <option key={option} value={option}>
                  {isEn
                    ? option === 'Immediatement'
                      ? 'Immediately'
                      : option === 'Sous 1 mois'
                        ? 'Within 1 month'
                        : 'Open to opportunities'
                    : option}
                </option>
              ))}
            </select>
            <button
              onClick={handleSaveProfileSection}
              disabled={isSavingProfileSection}
              className="rounded-xl bg-black px-4 py-3 text-sm font-extrabold text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
              {isSavingProfileSection ? (isEn ? 'Saving...' : 'Enregistrement...') : (isEn ? 'Save basics' : 'Enregistrer')}
            </button>
          </div>
          {profileSectionMessage ? (
            <p className={`text-xs font-bold ${profileSectionMessage.includes('saved') || profileSectionMessage.includes('enregistres') ? 'text-green-700' : 'text-red-600'}`}>
              {profileSectionMessage}
            </p>
          ) : null}

          {/* CV upload / builder cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              ref={cvFileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => handleCvFileUpload(e.target.files?.[0] || null)}
            />
            <button
              onClick={() => cvFileInputRef.current?.click()}
              disabled={isUploadingCv}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-5 sm:p-6 text-center bg-gray-50/50 hover:bg-gray-100/70 hover:border-green-300 transition group disabled:opacity-60"
            >
              <p className="text-3xl sm:text-4xl mb-2">&#128196;</p>
              <h3 className="font-extrabold mb-1 text-sm sm:text-base group-hover:text-green-700 transition">
                {isUploadingCv ? (isEn ? 'Uploading...' : 'Telechargement...') : (isEn ? 'Upload a CV (PDF)' : 'Uploader un CV (PDF)')}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">{isEn ? 'PDF, DOC — import an existing file' : 'PDF, DOC — importer un fichier deja pret'}</p>
              {uploadedDocuments.find((d) => d.type === 'cv') && (
                <p className="text-xs font-bold text-green-600 mt-1">&#10003; {isEn ? 'CV on file' : 'CV enregistre'}</p>
              )}
              {defaultCvUrl ? (
                <a
                  href={defaultCvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[11px] font-bold text-green-700 underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {isEn ? 'Open default CV' : 'Ouvrir le CV principal'}
                </a>
              ) : null}
            </button>
            <button
              onClick={() => {
                setCvBuilderOpen(true);
                setCvBuilderStep(1);
              }}
              className="rounded-2xl p-5 sm:p-6 text-left bg-gradient-to-br from-green-600 to-emerald-500 text-white hover:brightness-105 transition shadow-lg shadow-green-600/20"
            >
              <p className="text-xs uppercase tracking-widest font-extrabold opacity-90">{isEn ? 'New module' : 'Nouveau module'}</p>
              <h3 className="text-xl sm:text-2xl font-extrabold mt-2">&#10024; {isEn ? 'Build my candidate file' : 'Construire mon dossier candidat'}</h3>
              <p className="text-xs sm:text-sm mt-2 text-white/90">{isEn ? 'Visual assistant with live preview and PDF export' : 'Assistant visuel avec previsualisation en direct et export PDF'}</p>
            </button>
          </div>

          {/* ── CV Builder ── */}
          {cvBuilderOpen && (
            <div className="border border-gray-200 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-emerald-50 overflow-hidden shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              {cvBuilderStep === 1 && (
                <div className="p-4 sm:p-5 md:p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-base sm:text-lg md:text-xl font-extrabold">Etape 1 : Langue et modele</h3>
                    <button onClick={() => setCvBuilderOpen(false)} className="text-sm font-bold text-gray-500 hover:text-black w-fit">Fermer</button>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-2">Selecteur de langue</p>
                    <div className="inline-flex bg-white rounded-xl p-1 border border-gray-200">
                      <button
                        onClick={() => handleLanguageSwitch('FR')}
                        className={`px-4 py-2 rounded-lg text-sm font-extrabold transition ${cvLanguage === 'FR' ? 'bg-black text-white' : 'text-gray-600'}`}
                      >
                        FR
                      </button>
                      <button
                        onClick={() => handleLanguageSwitch('EN')}
                        className={`px-4 py-2 rounded-lg text-sm font-extrabold transition ${cvLanguage === 'EN' ? 'bg-black text-white' : 'text-gray-600'}`}
                      >
                        EN
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-3">{t.modelChoiceLabel}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {filteredTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setCvTemplate(template.id)}
                          className={`text-left rounded-xl border p-3 bg-white transition ${cvTemplate === template.id ? 'border-green-600 ring-2 ring-green-100' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="h-28 rounded-lg border border-gray-200 bg-gradient-to-b from-white to-gray-50 mb-3 p-2">
                            <div
                              className={`h-5 rounded ${
                                template.id === 'fr_moderne_cm'
                                  ? 'bg-green-500'
                                  : template.id === 'fr_classique_cm' || template.id === 'en_professional_cm'
                                    ? 'bg-gray-300'
                                    : 'bg-slate-200'
                              }`}
                            />
                            <div className="mt-2 space-y-1.5">
                              <div className="h-2 bg-gray-200 rounded" />
                              <div className="h-2 bg-gray-200 rounded w-4/5" />
                              <div className="h-2 bg-gray-200 rounded w-3/5" />
                            </div>
                          </div>
                          <h4 className="font-extrabold text-sm">{template.name}</h4>
                          <p className="text-xs text-gray-600 mt-1">{template.note}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setCvBuilderStep(2)}
                      className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-extrabold hover:bg-gray-800 transition"
                    >
                      {t.continueEditor}
                    </button>
                  </div>
                </div>
              )}

              {cvBuilderStep === 2 && (
                <div className="relative flex h-[85vh] min-h-[700px] flex-col bg-white">
                  <div className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-black tracking-tight text-gray-900 sm:text-lg">{t.step2Title}</h3>
                      <span className="hidden rounded-md bg-green-100 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-green-800 sm:inline-block">
                        {isEn ? 'Auto-save' : 'Sauvegarde auto'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="mr-4 hidden items-center gap-2 border-r border-gray-200 pr-4 lg:flex">
                        {filteredTemplates.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => setCvTemplate(template.id)}
                            className={`h-6 w-6 rounded-full border-2 transition-all ${
                              cvTemplate === template.id
                                ? 'border-black ring-2 ring-black/20 ring-offset-1'
                                : 'border-transparent hover:border-gray-300'
                            } ${
                              template.id === 'fr_moderne_cm'
                                ? 'bg-green-600'
                                : template.id === 'fr_classique_cm'
                                  ? 'bg-gray-800'
                                  : 'bg-blue-600'
                            }`}
                            title={template.name}
                          />
                        ))}
                      </div>
                      <button onClick={() => setCvBuilderOpen(false)} className="text-sm font-bold text-gray-400 transition hover:text-gray-900">
                        {t.close} &times;
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-1 overflow-hidden bg-gray-50">
                    <div className="z-10 flex w-16 shrink-0 flex-col items-center gap-2 border-r border-gray-200 bg-white py-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)] sm:w-20">
                      {[
                        { key: 'infos', icon: '👤', tooltip: t.accordionInfos },
                        { key: 'resume', icon: '📝', tooltip: t.accordionResume },
                        { key: 'exp', icon: '💼', tooltip: t.accordionExp },
                        { key: 'edu', icon: '🎓', tooltip: t.accordionEdu },
                        { key: 'skills', icon: '⚡', tooltip: t.accordionSkills },
                      ].map((item) => {
                        const isActive = openAccordion === item.key;
                        return (
                          <button
                            key={item.key}
                            title={item.tooltip}
                            onClick={() => setOpenAccordion(item.key as 'infos' | 'resume' | 'exp' | 'edu' | 'skills')}
                            className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all duration-200 ${
                              isActive
                                ? 'scale-110 border border-blue-200 bg-blue-50 shadow-sm'
                                : 'bg-transparent text-gray-400 hover:scale-105 hover:bg-gray-50'
                            }`}
                          >
                            <span className={isActive ? 'opacity-100' : 'opacity-60 grayscale'}>{item.icon}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative z-0 flex max-w-[450px] flex-1 flex-col border-r border-gray-200 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                      <div className="shrink-0 border-b border-gray-100 bg-gray-50/50 px-6 py-5">
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">
                          {openAccordion === 'infos' && t.accordionInfos}
                          {openAccordion === 'resume' && t.accordionResume}
                          {openAccordion === 'exp' && t.accordionExp}
                          {openAccordion === 'edu' && t.accordionEdu}
                          {openAccordion === 'skills' && t.accordionSkills}
                        </h4>
                      </div>

                      <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
                        {openAccordion === 'infos' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            <input value={cvData.fullName} onChange={(e) => updateCvData('fullName', e.target.value)} className={inputCls} placeholder={t.placeholderFullName} />
                            <input value={cvData.title} onChange={(e) => updateCvData('title', e.target.value)} className={inputCls} placeholder={t.placeholderTitle} />
                            <input value={cvData.location} onChange={(e) => updateCvData('location', e.target.value)} className={inputCls} placeholder={t.placeholderLocation} />
                            <div className="grid grid-cols-2 gap-3">
                              <input value={cvData.phone} onChange={(e) => updateCvData('phone', e.target.value)} className={inputCls} placeholder={t.placeholderPhone} />
                              <input value={cvData.email} onChange={(e) => updateCvData('email', e.target.value)} className={inputCls} placeholder={t.placeholderEmail} />
                            </div>
                          </div>
                        )}

                        {openAccordion === 'resume' && (
                          <div className="animate-in slide-in-from-left-4 space-y-4 duration-300 fade-in">
                            <div className="mb-1 flex items-center justify-between">
                              <label className="text-xs font-bold text-gray-700">{isEn ? 'Professional summary' : 'Votre resume professionnel'}</label>
                              <button onClick={handleOptimizeWithAi} disabled={isOptimizingCv} className="flex items-center gap-1 rounded bg-purple-50 px-2 py-1 text-[10px] font-black text-purple-600 transition hover:bg-purple-100 disabled:opacity-60">
                                ✨ {isOptimizingCv ? (isEn ? 'Generating...' : 'Generation...') : (isEn ? 'Improve with AI' : "Ameliorer avec l'IA")}
                              </button>
                            </div>
                            <textarea value={cvData.profile} onChange={(e) => updateCvData('profile', e.target.value)} className={`${inputCls} h-64 resize-none`} placeholder={t.placeholderIntro} />
                          </div>
                        )}

                        {openAccordion === 'exp' && (
                          <div className="animate-in slide-in-from-left-4 space-y-4 duration-300 fade-in">
                            <label className="mb-1 block text-xs font-bold text-gray-700">{isEn ? 'Work history' : 'Historique professionnel'}</label>
                            <textarea value={cvData.experience} onChange={(e) => updateCvData('experience', e.target.value)} className={`${inputCls} h-80 resize-none`} placeholder={t.placeholderExp} />
                            <p className="text-[10px] text-gray-500">{isEn ? 'Tip: use bullet points (-) to list missions and results.' : 'Astuce : utilisez des tirets (-) pour lister vos missions.'}</p>
                          </div>
                        )}

                        {openAccordion === 'edu' && (
                          <div className="animate-in slide-in-from-left-4 space-y-4 duration-300 fade-in">
                            <label className="mb-1 block text-xs font-bold text-gray-700">{isEn ? 'Education & certifications' : 'Diplomes & formations'}</label>
                            <textarea value={cvData.education} onChange={(e) => updateCvData('education', e.target.value)} className={`${inputCls} h-48 resize-none`} placeholder={t.placeholderEdu} />
                          </div>
                        )}

                        {openAccordion === 'skills' && (
                          <div className="animate-in slide-in-from-left-4 space-y-6 duration-300 fade-in">
                            <div>
                              <label className="mb-2 block text-xs font-bold text-gray-700">{isEn ? 'Key skills' : 'Competences cles'}</label>
                              <textarea value={cvData.skillsText} onChange={(e) => updateCvData('skillsText', e.target.value)} className={`${inputCls} h-24 resize-none`} placeholder={t.placeholderSkills} />
                            </div>
                            <div>
                              <label className="mb-2 block text-xs font-bold text-gray-700">{isEn ? 'Languages' : 'Langues maitrisees'}</label>
                              <textarea value={cvData.languagesText} onChange={(e) => updateCvData('languagesText', e.target.value)} className={`${inputCls} h-24 resize-none`} placeholder={t.placeholderLanguages} />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 border-t border-gray-200 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                        {aiDraft ? (
                          <button
                            onClick={handleApplyAiDraft}
                            className="w-full rounded-xl bg-purple-50 px-3 py-2 text-xs font-extrabold text-purple-700 transition hover:bg-purple-100"
                          >
                            ✨ {t.aiApplyDraft}
                          </button>
                        ) : null}
                        {cvActionMessage ? (
                          <p className="mb-1 rounded-md bg-blue-50 py-1 text-center text-[11px] font-bold text-blue-600">{cvActionMessage}</p>
                        ) : null}
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveAndApply}
                            disabled={isSavingCv}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black px-3 py-3 text-xs font-extrabold text-white shadow-md shadow-black/10 transition hover:bg-gray-800 sm:text-sm"
                          >
                            💾 {isSavingCv ? t.saving : t.saveApply}
                          </button>
                          <button
                            onClick={handleDownloadPdf}
                            disabled={isDownloadingPdf}
                            className="flex items-center justify-center rounded-xl bg-green-600 px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-green-600/20 transition hover:bg-green-700"
                            title={t.downloadPdf}
                          >
                            {isDownloadingPdf ? '⏳' : '📥 PDF'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="relative hidden flex-1 items-start justify-center overflow-y-auto bg-[#E8EDF2] p-8 shadow-inner md:flex">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
                      <div className="relative z-10 w-full max-w-[740px] origin-top transform transition-transform duration-500 hover:scale-[1.02]">
                        {renderCvPreview()}
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-6 right-6 z-50 md:hidden">
                    <button onClick={() => setMobilePreviewOpen(true)} className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-2xl text-white shadow-2xl transition hover:scale-105">
                      👀
                    </button>
                  </div>

                  {mobilePreviewOpen && (
                    <div className="fixed inset-0 z-50 bg-black/55 p-3 md:hidden">
                      <div className="h-full overflow-auto rounded-2xl bg-[#eceff3] p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-extrabold">{t.mobilePreview}</h4>
                          <button onClick={() => setMobilePreviewOpen(false)} className="text-sm font-bold text-gray-600">{t.close}</button>
                        </div>
                        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                          {filteredTemplates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => setCvTemplate(template.id)}
                              className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-extrabold ${cvTemplate === template.id ? 'border-black bg-black text-white' : 'border-gray-300 bg-white text-gray-700'}`}
                            >
                              {template.name}
                            </button>
                          ))}
                        </div>
                        {renderCvPreview()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Experience + Education text areas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-gray-50/30">
              <h3 className="font-extrabold mb-2 text-sm sm:text-base flex items-center gap-2">
                <span>&#128188;</span>
                {isEn ? 'Work experience' : 'Experiences professionnelles'}
              </h3>
              <textarea value={cvData.experience} onChange={(e) => updateCvData('experience', e.target.value)} className={`${inputCls} h-28 resize-none`} placeholder={isEn ? 'Add your experience timeline...' : 'Ajoutez vos experiences en timeline...'} />
            </div>
            <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-gray-50/30">
              <h3 className="font-extrabold mb-2 text-sm sm:text-base flex items-center gap-2">
                <span>&#127891;</span>
                {isEn ? 'Education' : 'Formations'}
              </h3>
              <textarea value={cvData.education} onChange={(e) => updateCvData('education', e.target.value)} className={`${inputCls} h-28 resize-none`} placeholder={isEn ? 'Degrees, schools, years...' : 'Diplomes, ecoles, annees...'} />
            </div>
          </div>

          {/* Skills tags */}
          <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-gray-50/30">
            <h3 className="font-extrabold mb-3 text-sm sm:text-base flex items-center gap-2">
              <span>&#127942;</span>
              {isEn ? 'Key skills (tags)' : 'Competences cles (tags)'}
            </h3>
            <div className="flex gap-2 mb-3">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                className={`flex-1 ${inputCls}`}
                placeholder="Ex: SEO, React, Negociation..."
              />
              <button onClick={addSkill} className="px-4 py-2 rounded-xl bg-black text-white font-bold text-sm hover:bg-gray-800 transition whitespace-nowrap">
                {isEn ? 'Add' : 'Ajouter'}
              </button>
            </div>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-sm font-bold hover:bg-green-100 transition">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="text-green-600/80 hover:text-red-500 transition text-base leading-none">&times;</button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">{isEn ? 'No skills added yet. Start typing above.' : 'Aucune competence ajoutee. Commencez a taper ci-dessus.'}</p>
            )}
          </div>
        </section>

        <section className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-5 sm:px-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <span>📨</span> {isEn ? 'My Applications' : 'Mes Candidatures'}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">{isEn ? 'Track the status of your applications.' : 'Suivez l evolution de vos candidatures.'}</p>
            </div>
          </div>

          {candidatures.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {candidatures.map((item) => {
                const dateStr = new Date(item.date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                return (
                  <div key={item.id} className="group flex flex-col justify-between px-5 py-4 transition-all duration-200 hover:bg-blue-50/30 sm:flex-row sm:items-center sm:px-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 shadow-sm transition-colors group-hover:bg-blue-100 group-hover:text-blue-600">
                        💼
                      </div>
                      <div>
                        <h3 className="cursor-pointer text-[15px] font-extrabold text-gray-900 transition-colors group-hover:text-blue-700">
                          {item.jobTitle}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-xs font-medium text-gray-500">
                          <span className="font-bold text-gray-700">{item.company}</span>
                          <span>•</span>
                          <span>{isEn ? `Applied ${dateStr}` : `Postule le ${dateStr}`}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex w-full items-center justify-between gap-4 sm:mt-0 sm:w-auto sm:justify-end">
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-extrabold ${statusClass(item.statut)}`}>
                        {item.statut}
                      </span>
                      {item.jobId ? (
                        <Link href={localizePath(`/annonce/${item.jobId}`)} className="text-xs font-bold text-gray-400 opacity-0 transition hover:text-blue-600 group-hover:opacity-100">
                          {isEn ? 'View offer →' : 'Voir l offre →'}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white py-10 text-center sm:py-14">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 sm:h-20 sm:w-20">
                <span className="text-3xl sm:text-4xl">📨</span>
              </div>
              <h4 className="mb-2 text-sm font-bold text-gray-900 sm:text-[15px]">{isEn ? 'No applications yet' : 'Aucune candidature'}</h4>
              <p className="mx-auto max-w-sm text-xs font-medium text-gray-500 sm:text-sm">
                {isEn ? 'Your applications will appear here once you apply to job listings.' : 'Vos candidatures apparaitront ici une fois que vous postulerez a des offres.'}
              </p>
              <Link href={localizePath('/emplois')} className="mt-4 inline-block text-sm font-bold text-blue-600 transition hover:text-blue-700">
                {isEn ? 'Browse jobs' : 'Parcourir les offres'} &rarr;
              </Link>
            </div>
          )}
        </section>

        <section className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-5 py-5 sm:px-6">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
                <span>🔖</span> {isEn ? 'Saved Jobs' : 'Emplois Sauvegardes'}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {isEn ? 'Keep your favorite offers within reach.' : 'Gardez vos offres preferees a portee de main.'}
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
              {emploisSauvegardes.length} {isEn ? 'saved' : 'sauvegardes'}
            </span>
          </div>

          {emploisSauvegardes.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {emploisSauvegardes.map((job) => (
                <div key={job.id} className="group flex flex-col justify-between px-5 py-4 transition-all duration-200 hover:bg-amber-50/30 sm:flex-row sm:items-center sm:px-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 shadow-sm transition-colors group-hover:bg-amber-100 group-hover:text-amber-600">
                      🔖
                    </div>
                    <div>
                      <h3 className="text-[15px] font-extrabold text-gray-900 transition-colors group-hover:text-amber-700">
                        {job.titre}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500">
                        <span className="font-bold text-gray-700">{job.entreprise}</span>
                        <span>•</span>
                        <span>{job.lieu}</span>
                        <span>•</span>
                        <span>{job.type}</span>
                        <span>•</span>
                        <span>{job.temps}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex w-full items-center justify-between gap-4 sm:mt-0 sm:w-auto sm:justify-end">
                    <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[11px] font-extrabold text-amber-700">
                      {isEn ? 'Saved' : 'Sauvegarde'}
                    </span>
                    <Link href={localizePath(buildJobDetailPath(job))} className="text-xs font-bold text-gray-400 opacity-0 transition hover:text-amber-700 group-hover:opacity-100">
                      {isEn ? 'View offer →' : 'Voir l offre →'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white py-10 text-center sm:py-14">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 sm:h-20 sm:w-20">
                <span className="text-3xl sm:text-4xl">🔖</span>
              </div>
              <h4 className="mb-2 text-sm font-bold text-gray-900 sm:text-[15px]">{isEn ? 'No saved jobs' : 'Aucun emploi sauvegarde'}</h4>
              <p className="mx-auto max-w-sm text-xs font-medium text-gray-500 sm:text-sm">
                {isEn ? 'Jobs you save will appear here for quick access.' : 'Les offres que vous sauvegardez apparaitront ici pour un acces rapide.'}
              </p>
              <Link href={localizePath('/emplois')} className="mt-4 inline-block text-sm font-bold text-amber-600 transition hover:text-amber-700">
                {isEn ? 'Explore jobs' : 'Explorer les offres'} &rarr;
              </Link>
            </div>
          )}
        </section>

        {/* ════════════ MES DOCUMENTS ════════════ */}
        <section className="bg-white rounded-2xl shadow-sm shadow-gray-200/60 p-5 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold flex items-center gap-2">
              <span role="img" aria-label="folder">&#128193;</span>
              {isEn ? 'My Documents' : 'Mes Documents'}
            </h2>
            <div className="flex gap-2">
              <input
                ref={docFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleDocumentUpload(e.target.files?.[0] || null)}
              />
              <button
                onClick={() => docFileInputRef.current?.click()}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 transition"
              >
                <span className="mr-1.5">+</span>
                {isEn ? 'Add document' : 'Ajouter un document'}
              </button>
            </div>
          </div>
          {uploadedDocuments.length > 0 ? (
            <div className="space-y-2">
              {uploadedDocuments.map((doc, index) => {
                const uploadDate = new Date(doc.uploadedAt).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                return (
                  <div key={index} className="border border-gray-200 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 hover:border-gray-300 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">📄</span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-black truncate">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {doc.type === 'cv' ? 'CV' : isEn ? 'Document' : 'Document'} &bull; {uploadDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 transition"
                      >
                        {isEn ? 'View' : 'Voir'}
                      </a>
                      <a
                        href={doc.url}
                        download={doc.name}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition"
                      >
                        {isEn ? 'Download' : 'Telecharger'}
                      </a>
                      <button
                        onClick={() => handleRemoveDocument(index)}
                        className="p-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 transition"
                        title={isEn ? 'Remove' : 'Supprimer'}
                      >
                        &#10005;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 sm:py-12">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl sm:text-4xl" role="img" aria-label="folder">&#128193;</span>
              </div>
              <h4 className="font-bold text-black text-sm sm:text-[15px] mb-2">{isEn ? 'No documents yet' : 'Aucun document'}</h4>
              <p className="text-xs sm:text-sm text-gray-500 font-medium max-w-sm mx-auto">
                {isEn ? 'Upload your CV, diplomas, or other supporting documents.' : 'Telechargez votre CV, diplomes ou autres documents justificatifs.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
                <button
                  onClick={() => cvFileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition"
                >
                  {isEn ? 'Upload CV' : 'Uploader un CV'}
                </button>
                <button
                  onClick={() => docFileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                >
                  {isEn ? 'Upload another document' : 'Ajouter un autre document'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ════════════ JOB ALERTS ════════════ */}
        <section className="bg-white rounded-2xl shadow-sm shadow-gray-200/60 p-5 sm:p-6 md:p-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold mb-2 flex items-center gap-2">
            <span role="img" aria-label="bell">&#128276;</span>
            {isEn ? 'Job Alerts' : 'Alertes Emploi'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-5">
            {isEn ? 'Get notified when a matching job is published.' : 'Recevez un email quand une offre correspondante est publiee.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={jobAlertRole} onChange={(e) => setJobAlertRole(e.target.value)} className={inputCls} placeholder={isEn ? 'Role (ex: Data Analyst)' : 'Metier (ex: Data Analyst)'} />
            <input value={jobAlertCity} onChange={(e) => setJobAlertCity(e.target.value)} className={inputCls} placeholder={isEn ? 'City (ex: Douala)' : 'Ville (ex: Douala)'} />
            <button onClick={handleSaveJobAlert} disabled={isSavingJobAlert} className="bg-black text-white rounded-xl px-4 py-3 font-extrabold text-sm hover:bg-gray-800 transition flex items-center justify-center gap-2 disabled:opacity-60">
              <span>&#128276;</span>
              {isSavingJobAlert ? (isEn ? 'Saving...' : 'Enregistrement...') : (isEn ? 'Enable alert' : 'Activer l alerte')}
            </button>
          </div>
          {jobAlertMessage ? (
            <p className={`mt-3 text-xs font-bold ${jobAlertMessage.includes('saved') || jobAlertMessage.includes('enregistree') ? 'text-green-700' : 'text-red-600'}`}>
              {jobAlertMessage}
            </p>
          ) : null}
        </section>

      </main>

      <Footer />
    </div>
  );
}
