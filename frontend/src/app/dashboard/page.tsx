"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { createCandidateProfile, fetchSessionUser, fetchUserSavedJobs, fetchUserApplications, fetchUserProfile, logoutUser, uploadFile, upsertUserProfile, ApiError, type ApiJob, type UserApplication } from '@/lib/api';
import { clearStoredSession, getStoredUser, hasRecentAuthSuccess, mergeStoredUser } from '@/lib/session';

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
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<number>(0);
  const [isVerified, setIsVerified] = useState(false);
  const [savedJobs, setSavedJobs] = useState<ApiJob[]>([]);
  const [candidatures, setCandidatures] = useState<UserApplication[]>([]);
  const [profileVisible, setProfileVisible] = useState(true);
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
      const raw = localStorage.getItem('bolo237-user');
      if (raw) {
        const parsed = JSON.parse(raw);
        setUserName(parsed?.name || parsed?.fullName || parsed?.nom || '');
        setUserId(Number(parsed?.id || 0));
        setProfilePhotoUrl(String(parsed?.photoUrl || ''));
        setIsVerified(Boolean(parsed?.isVerified));

        // Redirect to role-specific dashboard
        const role = parsed?.role || localStorage.getItem('bolo237-account-role') || '';
        if (role === 'ENTREPRISE') {
          router.replace(localizePath('/dashboard-entreprise'));
          return;
        }
        if (role === 'ARTISAN') {
          router.replace(localizePath('/dashboard-artisan'));
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [router, localizePath]);

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
    const loadApplications = async () => {
      try {
        const apps = await fetchUserApplications(userId);
        setCandidatures(apps);
      } catch {
        setCandidatures([]);
      }
    };
    loadApplications();
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
        setSkills(
          (profile.skillsText || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        );
      } catch {
        // ignore missing profile until first save
      }
    };

    loadProfile();
  }, [userId]);

  useEffect(() => {
    const ensureActiveUser = async () => {
      if (!userId) return;
      const recentAuth = hasRecentAuthSuccess();
      const maxAttempts = recentAuth ? 4 : 2;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 700 * attempt));
        } else {
          await new Promise((r) => setTimeout(r, 500));
        }

        try {
          const sessionUser = await fetchSessionUser();
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

      await logoutUser().catch(() => undefined);
      clearStoredSession();
      window.location.href = localizePath('/');
    };

    ensureActiveUser();
  }, [userId, localizePath]);

  // Vide — sera rempli par les vraies offres sauvegardees
  const emploisSauvegardes: { id: number; titre: string; entreprise: string; lieu: string; type: string; temps: string }[] = savedJobs.map((job) => {
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
  });

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value || skills.includes(value)) return;
    setSkills([...skills, value]);
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const statusClass = (status: string) => {
    if (status === 'En attente d entretien') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (status === 'Vue par l employeur') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'Refusee') return 'bg-red-50 text-red-700 border-red-200';
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
    Boolean(profilePhotoUrl),
  ];
  const completionPercent = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);
  const recommendationItems = [
    !profilePhotoUrl && (isEn ? 'Add a clear profile photo to reassure recruiters.' : 'Ajoutez une photo nette pour rassurer les recruteurs.'),
    !cvData.profile.trim() && (isEn ? 'Write a 3-line summary focused on your strongest value.' : 'Ajoutez un resume en 3 lignes oriente resultats.'),
    !cvData.experience.trim() && (isEn ? 'Describe one concrete mission with tools and outcomes.' : 'Decrivez au moins une mission concrete avec outils et resultats.'),
    !cvData.skillsText.trim() && (isEn ? 'List 6 to 8 practical skills recruiters search for.' : 'Listez 6 a 8 competences pratiques recherchees.'),
  ].filter(Boolean) as string[];

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    setCvActionMessage('');
    try {
      const uploaded = await uploadFile(file, 'candidate-photos');
      setProfilePhotoUrl(uploaded.url);
      mergeStoredUser({ photoUrl: uploaded.url });
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
      await createCandidateProfile({
        userId: userId || undefined,
        nom: cvData.fullName,
        titre: cvData.title,
        localisation: cvData.location.split(',')[0]?.trim() || 'Douala',
        experience: 'Confirme',
        disponibilite: 'Immediatement',
        etudes: 'Bac+3',
        competences: cvData.skillsText
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 8),
        disponibleNow: true,
      });

      if (userId) {
        await upsertUserProfile(userId, {
          fullName: cvData.fullName,
          title: cvData.title,
          location: cvData.location,
          phone: cvData.phone,
          email: cvData.email,
          profile: cvData.profile,
          experience: cvData.experience,
          education: cvData.education,
          skillsText: cvData.skillsText,
          languagesText: cvData.languagesText,
        });
      }

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

      mergeStoredUser({
        ...(storedUser || {}),
        name: cvData.fullName,
        title: cvData.title,
        phone: cvData.phone,
        skills: cvData.skillsText,
        photoUrl: profilePhotoUrl,
        cvUploaded: true,
        phoneVerified,
        profileComplete,
      });
      setUserName(cvData.fullName);

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
          <div className="w-16 h-16 rounded-2xl bg-white/80 border border-white/40 overflow-hidden flex items-center justify-center text-lg font-extrabold text-slate-700 shrink-0">
            {profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profilePhotoUrl} alt={cvData.fullName || 'Candidate'} className="w-full h-full object-cover" />
            ) : (
              <span>{(cvData.fullName || 'C').slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h3 className="text-xl font-extrabold tracking-tight">{cvData.fullName || t.fullNameFallback}</h3>
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

  /* ── input class helper ── */
  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition';

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

        {/* ════════════ WELCOME BANNER ════════════ */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#DA7756] via-[#C4623F] to-[#B5533A] p-5 sm:p-7 md:p-8 text-white shadow-lg shadow-[#DA7756]/20">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 blur-xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm sm:text-base font-medium text-white/80">
                {isEn ? 'Welcome back' : 'Bienvenue'}
                {userName ? ',' : '!'}
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-1 tracking-tight flex items-center gap-2 flex-wrap">
                {userName ? `${userName} ` : ''}{isEn ? '' : ''}
                <span className="inline-block" role="img" aria-label="wave">&#128075;</span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full text-xs font-bold" title={isEn ? 'Verified account' : 'Compte certifie'}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    {isEn ? 'Certified' : 'Certifie'}
                  </span>
                )}
              </h1>
              <p className="text-sm text-white/70 mt-2 max-w-md">
                {isEn
                  ? 'Manage your profile, build your CV, and track applications all in one place.'
                  : 'Gerez votre profil, creez votre CV et suivez vos candidatures depuis un seul endroit.'}
              </p>
            </div>
            <Link
              href={localizePath('/profil')}
              className="bg-white text-[#C4623F] px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#FFF5EF] transition shadow-sm w-fit whitespace-nowrap"
            >
              {isEn ? 'Edit my profile' : 'Modifier mon profil'}
            </Link>
          </div>
        </section>

        {/* ════════════ STATS + PROGRESS ════════════ */}
        <section className="bg-white rounded-2xl shadow-sm shadow-gray-200/60 p-5 sm:p-6 md:p-8 space-y-6">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-extrabold text-black text-sm sm:text-base flex items-center gap-2">
                <span role="img" aria-label="chart">&#128200;</span>
                {isEn ? 'Profile completion' : 'Profil complete'}
              </h2>
              <span className="text-sm font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">{completionPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-400 transition-all duration-700 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => photoInputRef.current?.click()}
                className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 transition"
              >
                <span className="mr-1.5" role="img" aria-label="camera">&#128247;</span>
                {profilePhotoUrl
                  ? (isEn ? 'Update profile photo' : 'Mettre a jour la photo profil')
                  : (isEn ? 'Add a photo to reach 85%' : 'Ajoutez une photo pour atteindre 85%')}
              </button>
              <button className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition">
                <span className="mr-1.5" role="img" aria-label="pencil">&#9997;&#65039;</span>
                {recommendationItems[0] || (isEn ? 'Complete your skills' : 'Completez vos competences')}
              </button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/40 border border-purple-100 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-100 flex items-center justify-center text-xl shrink-0">
                <span role="img" aria-label="eyes">&#128064;</span>
              </div>
              <div>
                <p className="text-xs uppercase text-purple-600/80 font-extrabold tracking-wide">{isEn ? 'Profile views' : 'Vues du profil'}</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-purple-900 mt-0.5">0</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 border border-blue-100 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-100 flex items-center justify-center text-xl shrink-0">
                <span role="img" aria-label="paper-plane">&#128232;</span>
              </div>
              <div>
                <p className="text-xs uppercase text-blue-600/80 font-extrabold tracking-wide">{isEn ? 'Applications sent' : 'Candidatures envoyees'}</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-900 mt-0.5">{candidatures.length}</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-100 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">
                <span role="img" aria-label="bookmark">&#128278;</span>
              </div>
              <div>
                <p className="text-xs uppercase text-amber-600/80 font-extrabold tracking-wide">{isEn ? 'Saved jobs' : 'Annonces sauvegardees'}</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-900 mt-0.5">{savedJobs.length}</p>
              </div>
            </div>
          </div>
        </section>

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
            <input className={`sm:col-span-2 ${inputCls}`} placeholder={isEn ? 'Profile title (ex: Marketing Project Manager)' : 'Titre du profil (ex: Chef de projet Marketing)'} />
            <input className={inputCls} placeholder={isEn ? 'Location' : 'Localisation'} />
          </div>
          <input className={inputCls} placeholder={isEn ? 'Availability (Immediately, Within 1 month...)' : 'Disponibilite (Immediatement, Sous 1 mois...)'} />

          {/* CV upload / builder cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button className="border-2 border-dashed border-gray-200 rounded-2xl p-5 sm:p-6 text-center bg-gray-50/50 hover:bg-gray-100/70 hover:border-gray-300 transition group">
              <p className="text-3xl sm:text-4xl mb-2">&#128196;</p>
              <h3 className="font-extrabold mb-1 text-sm sm:text-base group-hover:text-green-700 transition">{isEn ? 'Upload a CV (PDF)' : 'Uploader un CV (PDF)'}</h3>
              <p className="text-xs sm:text-sm text-gray-500">{isEn ? 'Import an existing file' : 'Importer un fichier deja pret'}</p>
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
                <div className="relative">
                  {/* Desktop toolbar */}
                  <div className="hidden md:flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
                    <h3 className="text-base font-extrabold">{t.step2Title}</h3>
                    <div className="flex items-center gap-2">
                      {filteredTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setCvTemplate(template.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border ${cvTemplate === template.id ? 'bg-black text-white border-black' : 'bg-white border-gray-300 text-gray-700'}`}
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Split-screen editor */}
                  <div className="md:grid md:grid-cols-5 min-h-[700px]">
                    {/* Form side */}
                    <div className="md:col-span-2 bg-white/95 border-r border-gray-200 p-3 sm:p-4 md:p-5 space-y-3 pb-24 md:pb-24">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700 mb-2">
                          {isEn ? 'Quick recommendations' : 'Recommandations rapides'}
                        </p>
                        <div className="space-y-2 text-xs text-emerald-900 font-medium">
                          {(recommendationItems.length > 0 ? recommendationItems : [isEn ? 'Your file looks complete. Refine your wording before saving.' : 'Votre dossier est presque pret. Soignez maintenant les formulations.']).slice(0, 3).map((item) => (
                            <p key={item} className="flex items-start gap-2">
                              <span className="mt-0.5">•</span>
                              <span>{item}</span>
                            </p>
                          ))}
                        </div>
                      </div>

                      {[
                        { key: 'infos', title: t.accordionInfos, icon: '\u{1F464}' },
                        { key: 'resume', title: t.accordionResume, icon: '\u{1F4DD}' },
                        { key: 'exp', title: t.accordionExp, icon: '\u{1F4BC}' },
                        { key: 'edu', title: t.accordionEdu, icon: '\u{1F393}' },
                        { key: 'skills', title: t.accordionSkills, icon: '\u{2B50}' },
                      ].map((item) => {
                        const isOpen = openAccordion === item.key;
                        return (
                          <div key={item.key} className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setOpenAccordion(isOpen ? 'infos' : (item.key as 'infos' | 'resume' | 'exp' | 'edu' | 'skills'))}
                              className="w-full px-4 py-3 bg-gray-50 text-left font-extrabold text-sm flex items-center justify-between hover:bg-gray-100 transition"
                            >
                              <span className="flex items-center gap-2">
                                <span>{item.icon}</span>
                                <span>{item.title}</span>
                              </span>
                              <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>&#9660;</span>
                            </button>

                            {isOpen && item.key === 'infos' && (
                              <div className="p-3 sm:p-4 space-y-2 bg-white">
                                <input value={cvData.fullName} onChange={(e) => updateCvData('fullName', e.target.value)} className={inputCls} placeholder={t.placeholderFullName} />
                                <input value={cvData.title} onChange={(e) => updateCvData('title', e.target.value)} className={inputCls} placeholder={t.placeholderTitle} />
                                <input value={cvData.location} onChange={(e) => updateCvData('location', e.target.value)} className={inputCls} placeholder={t.placeholderLocation} />
                                <input value={cvData.phone} onChange={(e) => updateCvData('phone', e.target.value)} className={inputCls} placeholder={t.placeholderPhone} />
                                <input value={cvData.email} onChange={(e) => updateCvData('email', e.target.value)} className={inputCls} placeholder={t.placeholderEmail} />
                                <input
                                  ref={photoInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null)}
                                />
                                <button
                                  onClick={() => photoInputRef.current?.click()}
                                  className="w-full border border-dashed border-emerald-300 rounded-xl px-3 py-3 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 transition"
                                >
                                  &#128247; {isUploadingPhoto ? (isEn ? 'Uploading photo...' : 'Telechargement photo...') : t.addPhoto}
                                </button>
                                {profilePhotoUrl && (
                                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 flex items-center gap-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={profilePhotoUrl} alt={cvData.fullName || 'Candidate'} className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                                    <div>
                                      <p className="text-xs font-extrabold text-gray-800">{isEn ? 'Photo ready' : 'Photo prete'}</p>
                                      <p className="text-[11px] text-gray-500">{isEn ? 'This visual will appear in your CV preview.' : 'Ce visuel apparaitra dans l apercu du CV.'}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {isOpen && item.key === 'resume' && (
                              <div className="p-3 sm:p-4 bg-white">
                                <textarea value={cvData.profile} onChange={(e) => updateCvData('profile', e.target.value)} className={`${inputCls} h-28 resize-none`} placeholder={t.placeholderIntro} />
                              </div>
                            )}

                            {isOpen && item.key === 'exp' && (
                              <div className="p-3 sm:p-4 bg-white">
                                <textarea value={cvData.experience} onChange={(e) => updateCvData('experience', e.target.value)} className={`${inputCls} h-36 resize-none`} placeholder={t.placeholderExp} />
                              </div>
                            )}

                            {isOpen && item.key === 'edu' && (
                              <div className="p-3 sm:p-4 bg-white">
                                <textarea value={cvData.education} onChange={(e) => updateCvData('education', e.target.value)} className={`${inputCls} h-28 resize-none`} placeholder={t.placeholderEdu} />
                              </div>
                            )}

                            {isOpen && item.key === 'skills' && (
                              <div className="p-3 sm:p-4 space-y-2 bg-white">
                                <textarea value={cvData.skillsText} onChange={(e) => updateCvData('skillsText', e.target.value)} className={`${inputCls} h-20 resize-none`} placeholder={t.placeholderSkills} />
                                <textarea value={cvData.languagesText} onChange={(e) => updateCvData('languagesText', e.target.value)} className={`${inputCls} h-20 resize-none`} placeholder={t.placeholderLanguages} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Preview side (desktop) */}
                    <div className="hidden md:block md:col-span-3 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_35%),linear-gradient(180deg,#eef4f4_0%,#dde7ea_100%)] p-6">
                      <div className="mb-4 rounded-2xl border border-white/70 bg-white/75 backdrop-blur px-4 py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gray-500">{isEn ? 'Live preview' : 'Apercu en direct'}</p>
                          <p className="text-sm font-semibold text-gray-700">{isEn ? 'Recruiters see this version first. Keep it direct and credible.' : 'Les recruteurs voient cette version en premier. Soyez direct et credible.'}</p>
                        </div>
                        <div className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700">
                          {completionPercent}%
                        </div>
                      </div>
                      {renderCvPreview()}
                    </div>
                  </div>

                  {/* Mobile preview button */}
                  <div className="md:hidden p-4 bg-white border-t border-gray-200">
                    <button
                      onClick={() => setMobilePreviewOpen(true)}
                      className="fixed bottom-4 left-4 right-4 bg-black text-white py-3 rounded-xl font-extrabold text-sm shadow-xl z-40"
                    >
                      &#128065;&#65039; {t.mobilePreview}
                    </button>
                  </div>

                  {/* Mobile preview modal */}
                  {mobilePreviewOpen && (
                    <div className="fixed inset-0 bg-black/55 z-50 md:hidden p-3">
                      <div className="bg-[#eceff3] rounded-2xl h-full overflow-auto p-3">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-extrabold">{t.mobilePreview}</h4>
                          <button onClick={() => setMobilePreviewOpen(false)} className="text-sm font-bold text-gray-600">{t.close}</button>
                        </div>
                        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                          {filteredTemplates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => setCvTemplate(template.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border whitespace-nowrap ${cvTemplate === template.id ? 'bg-black text-white border-black' : 'bg-white border-gray-300 text-gray-700'}`}
                            >
                              {template.name}
                            </button>
                          ))}
                        </div>
                        {renderCvPreview()}
                      </div>
                    </div>
                  )}

                  {/* Action bar */}
                  <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 sm:p-4 flex flex-col gap-2">
                    {isOptimizingCv && (
                      <div className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 animate-pulse">
                        <p className="text-xs font-extrabold text-purple-700">{t.aiOptimizing}</p>
                      </div>
                    )}

                    {aiDraft && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
                        <p className="text-xs font-extrabold uppercase tracking-wide text-gray-600">
                          {isEn ? 'AI draft (editable before apply)' : 'Version IA (modifiable avant application)'}
                        </p>
                        <textarea
                          value={aiDraft.profile}
                          onChange={(e) => setAiDraft((prev) => (prev ? { ...prev, profile: e.target.value } : prev))}
                          className={`${inputCls} h-20 resize-none`}
                          placeholder={t.placeholderIntro}
                        />
                        <textarea
                          value={aiDraft.experience}
                          onChange={(e) => setAiDraft((prev) => (prev ? { ...prev, experience: e.target.value } : prev))}
                          className={`${inputCls} h-24 resize-none`}
                          placeholder={t.placeholderExp}
                        />
                        <button
                          onClick={handleApplyAiDraft}
                          className="w-full sm:w-auto bg-purple-600 text-white px-4 py-2 rounded-xl font-extrabold text-sm hover:bg-purple-700 transition"
                        >
                          {t.aiApplyDraft}
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                      <button
                        onClick={handleOptimizeWithAi}
                        disabled={isOptimizingCv}
                        className="bg-purple-600 text-white px-4 py-2.5 rounded-xl font-extrabold text-sm hover:bg-purple-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        <span>&#10024;</span>
                        {isOptimizingCv ? t.aiOptimizing : t.aiOptimize}
                      </button>
                      <button
                        onClick={handleSaveAndApply}
                        disabled={isSavingCv}
                        className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-extrabold text-sm hover:bg-green-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        <span>&#128190;</span>
                        {isSavingCv ? t.saving : t.saveApply}
                      </button>
                      <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloadingPdf}
                        className="bg-black text-white px-4 py-2.5 rounded-xl font-extrabold text-sm hover:bg-gray-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        <span>&#128229;</span>
                        {isDownloadingPdf ? t.generating : t.downloadPdf}
                      </button>
                    </div>
                    {cvActionMessage && (
                      <p className="text-xs font-bold text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{cvActionMessage}</p>
                    )}
                  </div>
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
              <textarea className={`${inputCls} h-28 resize-none`} placeholder={isEn ? 'Add your experience timeline...' : 'Ajoutez vos experiences en timeline...'} />
            </div>
            <div className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-gray-50/30">
              <h3 className="font-extrabold mb-2 text-sm sm:text-base flex items-center gap-2">
                <span>&#127891;</span>
                {isEn ? 'Education' : 'Formations'}
              </h3>
              <textarea className={`${inputCls} h-28 resize-none`} placeholder={isEn ? 'Degrees, schools, years...' : 'Diplomes, ecoles, annees...'} />
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

        {/* ════════════ APPLICATIONS ════════════ */}
        <section className="bg-white rounded-2xl shadow-sm shadow-gray-200/60 p-5 sm:p-6 md:p-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold mb-5 flex items-center gap-2">
            <span role="img" aria-label="inbox">&#128232;</span>
            {isEn ? 'My Applications' : 'Mes Candidatures'}
          </h2>
          {candidatures.length > 0 ? (
            <div className="space-y-3">
              {candidatures.map((item) => {
                const dateStr = new Date(item.date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                return (
                <article key={item.id} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-gray-300 transition">
                  <div>
                    <h3 className="font-extrabold text-black">{item.jobTitle}</h3>
                    <p className="text-sm text-gray-600">{item.company}</p>
                    <p className="text-xs text-gray-500 mt-1">{isEn ? `Sent on ${dateStr}` : `Envoyee le ${dateStr}`}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold border w-fit ${statusClass(item.statut)}`}>
                    {item.statut}
                  </span>
                </article>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 sm:py-14">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl sm:text-4xl" role="img" aria-label="inbox">&#128232;</span>
              </div>
              <h4 className="font-bold text-black text-sm sm:text-[15px] mb-2">{isEn ? 'No applications yet' : 'Aucune candidature'}</h4>
              <p className="text-xs sm:text-sm text-gray-500 font-medium max-w-sm mx-auto">
                {isEn ? 'Your applications will appear here once you apply to job listings.' : 'Vos candidatures apparaitront ici une fois que vous postulerez a des offres.'}
              </p>
              <Link href={localizePath('/emplois')} className="inline-block mt-4 text-sm font-bold text-green-700 hover:text-green-800 transition">
                {isEn ? 'Browse jobs' : 'Parcourir les offres'} &rarr;
              </Link>
            </div>
          )}
        </section>

        {/* ════════════ SAVED JOBS ════════════ */}
        <section className="bg-white rounded-2xl shadow-sm shadow-gray-200/60 p-5 sm:p-6 md:p-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold mb-5 flex items-center gap-2">
            <span role="img" aria-label="bookmark">&#128278;</span>
            {isEn ? 'Saved Jobs' : 'Emplois Sauvegardes'}
          </h2>
          {emploisSauvegardes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {emploisSauvegardes.map((job) => (
                <article key={job.id} className="border border-gray-200 rounded-2xl p-4 sm:p-5 bg-white hover:border-green-400 hover:shadow-md transition group">
                  <h3 className="font-extrabold text-black mb-1 group-hover:text-green-700 transition">{job.titre}</h3>
                  <p className="text-sm text-gray-700 font-bold">{job.entreprise}</p>
                  <p className="text-sm text-gray-500">{job.lieu} &bull; {job.type}</p>
                  <p className="text-xs text-gray-400 mt-2">{job.temps}</p>
                  <button className="mt-4 w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-extrabold hover:bg-green-700 transition">
                    {isEn ? 'Apply now' : 'Postuler maintenant'}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 sm:py-14">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl sm:text-4xl" role="img" aria-label="bookmark">&#128278;</span>
              </div>
              <h4 className="font-bold text-black text-sm sm:text-[15px] mb-2">{isEn ? 'No saved jobs' : 'Aucun emploi sauvegarde'}</h4>
              <p className="text-xs sm:text-sm text-gray-500 font-medium max-w-sm mx-auto">
                {isEn ? 'Jobs you save will appear here for quick access.' : 'Les offres que vous sauvegardez apparaitront ici pour un acces rapide.'}
              </p>
              <Link href={localizePath('/emplois')} className="inline-block mt-4 text-sm font-bold text-green-700 hover:text-green-800 transition">
                {isEn ? 'Explore jobs' : 'Explorer les offres'} &rarr;
              </Link>
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
            <input className={inputCls} placeholder={isEn ? 'Role (ex: Data Analyst)' : 'Metier (ex: Data Analyst)'} />
            <input className={inputCls} placeholder={isEn ? 'City (ex: Douala)' : 'Ville (ex: Douala)'} />
            <button className="bg-black text-white rounded-xl px-4 py-3 font-extrabold text-sm hover:bg-gray-800 transition flex items-center justify-center gap-2">
              <span>&#128276;</span>
              {isEn ? 'Enable alert' : 'Activer l alerte'}
            </button>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
