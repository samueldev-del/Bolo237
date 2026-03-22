"use client";

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';

export default function DashboardCandidat() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';
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
  const [cvActionMessage, setCvActionMessage] = useState('');
  const [cvData, setCvData] = useState({
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

  // Vide — sera rempli par les vraies candidatures de l'utilisateur
  const candidatures: { id: number; poste: string; entreprise: string; date: string; statut: string }[] = [];

  // Vide — sera rempli par les vraies offres sauvegardees
  const emploisSauvegardes: { id: number; titre: string; entreprise: string; lieu: string; type: string; temps: string }[] = [];

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
    if (status === 'En attente d entretien') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (status === 'Vue par l employeur') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (status === 'Refusee') return 'bg-red-50 text-red-700 border-red-100';
    return 'bg-green-50 text-green-700 border-green-100';
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
      note: 'Structure claire avec accent local 237jobs, ideal tertiaire et entreprises privees.',
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
      saveSuccess: 'CV enregistre et applique au profil. Il est aussi disponible dans la CVtheque.',
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
      saveApply: '💾 Enregistrer & Appliquer a mon profil',
      generating: 'Generation...',
      downloadPdf: '📥 Telecharger en PDF',
      continueEditor: 'Continuer vers l editeur',
    },
    EN: {
      requiredNameTitle: 'Please enter at least full name and job title before saving.',
      saveSuccess: 'CV saved and applied to your profile. It is now visible in the CVtheque.',
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
      saveApply: '💾 Save & Apply to my profile',
      generating: 'Generating...',
      downloadPdf: '📥 Download PDF',
      continueEditor: 'Continue to editor',
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

  const handleSaveAndApply = async () => {
    if (!cvData.fullName.trim() || !cvData.title.trim()) {
      setCvActionMessage(t.requiredNameTitle);
      return;
    }

    setIsSavingCv(true);
    setCvActionMessage('');

    try {
      const payload = {
        language: cvLanguage,
        template: cvTemplate,
        cvData,
      };

      const response = await fetch('/api/cv-builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Impossible de sauvegarder le CV pour le moment.');
      }

      const result = await response.json();

      const mappedCandidate = {
        id: result?.candidate?.id ?? Date.now(),
        nom: cvData.fullName,
        titre: cvData.title,
        localisation: cvData.location.split(',')[0]?.trim() || 'Douala',
        experience: 'Confirme',
        disponibilite: 'Immediatement',
        etudes: 'Bac+3',
        cvMajJours: 0,
        competences: cvData.skillsText
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 8),
        disponibleNow: true,
      };

      const existingRaw = localStorage.getItem('cvtheque_custom_candidates');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const deduped = [mappedCandidate, ...existing.filter((item: { id: number }) => item.id !== mappedCandidate.id)];
      localStorage.setItem('cvtheque_custom_candidates', JSON.stringify(deduped));

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
      doc.text(`${cvData.location} | ${cvData.phone} | ${cvData.email}`, margin, y);
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
    <div className={`bg-white rounded-lg border ${previewTheme} w-full max-w-[740px] aspect-[1/1.414] mx-auto overflow-hidden`}>
      <div className={`px-6 py-4 ${previewHeader}`}>
        <h3 className="text-xl font-extrabold tracking-tight">{cvData.fullName || t.fullNameFallback}</h3>
        <p className="text-sm font-semibold mt-1">{cvData.title || t.profileTitleFallback}</p>
        <p className="text-xs opacity-90 mt-2">{cvData.location} • {cvData.phone} • {cvData.email}</p>
      </div>

      <div className="p-6 space-y-4 text-[12.5px] leading-5 text-gray-800">
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

  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans text-black flex flex-col">
      <Header />

      <main className="max-w-[1200px] mx-auto w-full px-4 py-8 md:py-10 space-y-8 grow">
        <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <h1 className="text-2xl md:text-3xl font-extrabold">{isEn ? 'My Candidate Dashboard' : 'Mon Dashboard Candidat'}</h1>
            <Link href={localizePath('/profil')} className="bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition w-fit">
              {isEn ? 'Edit my profile' : 'Modifier mon profil'}
            </Link>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-extrabold text-black">{isEn ? 'Profile completion: 0%' : 'Profil complete a 0%'}</h2>
              <span className="text-sm font-bold text-green-700">0%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full w-[0%] bg-green-600 rounded-full"></div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button className="px-4 py-2 rounded-lg text-sm font-bold bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 transition">
                {isEn ? 'Add a photo to reach 85%' : 'Ajoutez une photo pour atteindre 85%'}
              </button>
              <button className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition">
                {isEn ? 'Complete your skills' : 'Completez vos competences'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs uppercase text-gray-500 font-extrabold mb-1">{isEn ? 'Profile views' : 'Vues du profil'}</p>
              <p className="text-2xl font-extrabold text-black">0</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs uppercase text-gray-500 font-extrabold mb-1">{isEn ? 'Applications sent' : 'Candidatures envoyees'}</p>
              <p className="text-2xl font-extrabold text-black">0</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs uppercase text-gray-500 font-extrabold mb-1">{isEn ? 'Saved jobs' : 'Annonces sauvegardees'}</p>
              <p className="text-2xl font-extrabold text-black">0</p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl md:text-2xl font-extrabold">{isEn ? 'My Profile / My CV' : 'Mon Profil / Mon CV'}</h2>
            <label className="inline-flex items-center gap-2 text-sm font-bold text-gray-700">
              <span>{isEn ? 'Visible in CV database' : 'Visible dans la CVtheque'}</span>
              <button
                onClick={() => setProfileVisible(!profileVisible)}
                className={`w-14 h-8 rounded-full p-1 transition ${profileVisible ? 'bg-green-600' : 'bg-gray-300'}`}
              >
                <span className={`block w-6 h-6 rounded-full bg-white transition ${profileVisible ? 'translate-x-6' : ''}`}></span>
              </button>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="md:col-span-2 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder={isEn ? 'Profile title (ex: Marketing Project Manager)' : 'Titre du profil (ex: Chef de projet Marketing)'} />
            <input className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder={isEn ? 'Location' : 'Localisation'} />
          </div>
          <input className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder={isEn ? 'Availability (Immediately, Within 1 month...)' : 'Disponibilite (Immediatement, Sous 1 mois...)'} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center bg-gray-50 hover:bg-gray-100 transition">
              <p className="text-3xl mb-2">📄</p>
              <h3 className="font-extrabold mb-1">{isEn ? 'Upload a CV (PDF)' : 'Uploader un CV (PDF)'}</h3>
              <p className="text-sm text-gray-500">{isEn ? 'Import an existing file' : 'Importer un fichier deja pret'}</p>
            </button>
            <button
              onClick={() => {
                setCvBuilderOpen(true);
                setCvBuilderStep(1);
              }}
              className="rounded-2xl p-6 text-left bg-gradient-to-br from-green-600 to-emerald-500 text-white hover:brightness-105 transition shadow-lg"
            >
              <p className="text-xs uppercase tracking-widest font-extrabold opacity-90">{isEn ? 'New module' : 'Nouveau module'}</p>
              <h3 className="text-2xl font-extrabold mt-2">✨ {isEn ? 'Build my CV online' : 'Creer mon CV en ligne'}</h3>
              <p className="text-sm mt-2 text-white/90">{isEn ? 'Visual assistant with live preview and PDF export' : 'Assistant visuel avec previsualisation en direct et export PDF'}</p>
            </button>
          </div>

          {cvBuilderOpen && (
            <div className="border border-gray-200 rounded-2xl bg-[#f6f7f9] overflow-hidden">
              {cvBuilderStep === 1 && (
                <div className="p-5 md:p-6 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <h3 className="text-lg md:text-xl font-extrabold">Etape 1 : Langue et modele</h3>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                            ></div>
                            <div className="mt-2 space-y-1.5">
                              <div className="h-2 bg-gray-200 rounded"></div>
                              <div className="h-2 bg-gray-200 rounded w-4/5"></div>
                              <div className="h-2 bg-gray-200 rounded w-3/5"></div>
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
                      className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-extrabold hover:bg-gray-800 transition"
                    >
                      {t.continueEditor}
                    </button>
                  </div>
                </div>
              )}

              {cvBuilderStep === 2 && (
                <div className="relative">
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

                  <div className="md:grid md:grid-cols-5 min-h-[640px]">
                    <div className="md:col-span-2 bg-white border-r border-gray-200 p-4 md:p-5 space-y-3 pb-24 md:pb-24">
                      {[
                        { key: 'infos', title: t.accordionInfos },
                        { key: 'resume', title: t.accordionResume },
                        { key: 'exp', title: t.accordionExp },
                        { key: 'edu', title: t.accordionEdu },
                        { key: 'skills', title: t.accordionSkills },
                      ].map((item) => {
                        const isOpen = openAccordion === item.key;
                        return (
                          <div key={item.key} className="border border-gray-200 rounded-xl overflow-hidden">
                            <button
                              onClick={() => setOpenAccordion(isOpen ? 'infos' : (item.key as 'infos' | 'resume' | 'exp' | 'edu' | 'skills'))}
                              className="w-full px-4 py-3 bg-gray-50 text-left font-extrabold text-sm flex items-center justify-between"
                            >
                              <span>{item.title}</span>
                              <span>{isOpen ? '−' : '+'}</span>
                            </button>

                            {isOpen && item.key === 'infos' && (
                              <div className="p-4 space-y-2 bg-white">
                                <input value={cvData.fullName} onChange={(e) => updateCvData('fullName', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t.placeholderFullName} />
                                <input value={cvData.title} onChange={(e) => updateCvData('title', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t.placeholderTitle} />
                                <input value={cvData.location} onChange={(e) => updateCvData('location', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t.placeholderLocation} />
                                <input value={cvData.phone} onChange={(e) => updateCvData('phone', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t.placeholderPhone} />
                                <input value={cvData.email} onChange={(e) => updateCvData('email', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t.placeholderEmail} />
                                <button className="w-full border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">{t.addPhoto}</button>
                              </div>
                            )}

                            {isOpen && item.key === 'resume' && (
                              <div className="p-4 bg-white">
                                <textarea value={cvData.profile} onChange={(e) => updateCvData('profile', e.target.value)} className="w-full h-28 border border-gray-300 rounded-lg p-3 text-sm" placeholder={t.placeholderIntro} />
                              </div>
                            )}

                            {isOpen && item.key === 'exp' && (
                              <div className="p-4 bg-white">
                                <textarea value={cvData.experience} onChange={(e) => updateCvData('experience', e.target.value)} className="w-full h-36 border border-gray-300 rounded-lg p-3 text-sm" placeholder={t.placeholderExp} />
                              </div>
                            )}

                            {isOpen && item.key === 'edu' && (
                              <div className="p-4 bg-white">
                                <textarea value={cvData.education} onChange={(e) => updateCvData('education', e.target.value)} className="w-full h-28 border border-gray-300 rounded-lg p-3 text-sm" placeholder={t.placeholderEdu} />
                              </div>
                            )}

                            {isOpen && item.key === 'skills' && (
                              <div className="p-4 space-y-2 bg-white">
                                <textarea value={cvData.skillsText} onChange={(e) => updateCvData('skillsText', e.target.value)} className="w-full h-20 border border-gray-300 rounded-lg p-3 text-sm" placeholder={t.placeholderSkills} />
                                <textarea value={cvData.languagesText} onChange={(e) => updateCvData('languagesText', e.target.value)} className="w-full h-20 border border-gray-300 rounded-lg p-3 text-sm" placeholder={t.placeholderLanguages} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="hidden md:block md:col-span-3 bg-[#eceff3] p-6">
                      {renderCvPreview()}
                    </div>
                  </div>

                  <div className="md:hidden p-4 bg-white border-t border-gray-200">
                    <button
                      onClick={() => setMobilePreviewOpen(true)}
                      className="fixed bottom-4 left-4 right-4 bg-black text-white py-3 rounded-xl font-extrabold text-sm shadow-xl z-40"
                    >
                      👁️ {t.mobilePreview}
                    </button>
                  </div>

                  {mobilePreviewOpen && (
                    <div className="fixed inset-0 bg-black/55 z-50 md:hidden p-3">
                      <div className="bg-[#eceff3] rounded-2xl h-full overflow-auto p-3">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-extrabold">{t.mobilePreview}</h4>
                          <button onClick={() => setMobilePreviewOpen(false)} className="text-sm font-bold text-gray-600">{t.close}</button>
                        </div>
                        <div className="mb-3 flex gap-2">
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
                        {renderCvPreview()}
                      </div>
                    </div>
                  )}

                  <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 p-3 md:p-4 flex flex-col gap-2">
                    <div className="flex flex-col md:flex-row gap-2 md:justify-between">
                      <button
                        onClick={handleSaveAndApply}
                        disabled={isSavingCv}
                        className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-extrabold text-sm hover:bg-green-700 transition disabled:opacity-60"
                      >
                        {isSavingCv ? t.saving : t.saveApply}
                      </button>
                      <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloadingPdf}
                        className="bg-black text-white px-4 py-2.5 rounded-lg font-extrabold text-sm hover:bg-gray-800 transition disabled:opacity-60"
                      >
                        {isDownloadingPdf ? t.generating : t.downloadPdf}
                      </button>
                    </div>
                    {cvActionMessage && <p className="text-xs font-bold text-gray-700">{cvActionMessage}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-extrabold mb-2">Experiences professionnelles</h3>
              <textarea className="w-full h-28 border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="Ajoutez vos experiences en timeline..." />
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-extrabold mb-2">Formations</h3>
              <textarea className="w-full h-28 border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="Diplomes, ecoles, annees..." />
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <h3 className="font-extrabold mb-3">Competences cles (tags)</h3>
            <div className="flex gap-2 mb-3">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                placeholder="Ex: SEO, React, Negociation..."
              />
              <button onClick={addSkill} className="px-4 py-2 rounded-lg bg-black text-white font-bold text-sm hover:bg-gray-800 transition">
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-sm font-bold">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="text-green-700/80 hover:text-red-600">×</button>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-extrabold mb-5">{isEn ? 'My Applications' : 'Mes Candidatures'}</h2>
          {candidatures.length > 0 ? (
            <div className="space-y-3">
              {candidatures.map((item) => (
                <article key={item.id} className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-black">{item.poste}</h3>
                    <p className="text-sm text-gray-600">{item.entreprise}</p>
                    <p className="text-xs text-gray-500 mt-1">{isEn ? `Sent on ${item.date}` : `Envoyee le ${item.date}`}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold border w-fit ${statusClass(item.statut)}`}>
                    {item.statut}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-4xl mb-4">📨</p>
              <h4 className="font-bold text-black text-[15px] mb-2">{isEn ? 'No applications yet' : 'Aucune candidature'}</h4>
              <p className="text-sm text-gray-500 font-medium">
                {isEn ? 'Your applications will appear here once you apply to job listings.' : 'Vos candidatures apparaitront ici une fois que vous postulerez a des offres.'}
              </p>
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-extrabold mb-5">{isEn ? 'Saved Jobs' : 'Emplois Sauvegardes'}</h2>
          {emploisSauvegardes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emploisSauvegardes.map((job) => (
                <article key={job.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-green-600 transition">
                  <h3 className="font-extrabold text-black mb-1">{job.titre}</h3>
                  <p className="text-sm text-gray-700 font-bold">{job.entreprise}</p>
                  <p className="text-sm text-gray-500">{job.lieu} • {job.type}</p>
                  <p className="text-xs text-gray-400 mt-2">{job.temps}</p>
                  <button className="mt-4 w-full py-2.5 rounded-lg bg-green-600 text-white text-sm font-extrabold hover:bg-green-700 transition">
                    {isEn ? 'Apply now' : 'Postuler maintenant'}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-4xl mb-4">🔖</p>
              <h4 className="font-bold text-black text-[15px] mb-2">{isEn ? 'No saved jobs' : 'Aucun emploi sauvegarde'}</h4>
              <p className="text-sm text-gray-500 font-medium">
                {isEn ? 'Jobs you save will appear here for quick access.' : 'Les offres que vous sauvegardez apparaitront ici pour un acces rapide.'}
              </p>
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-extrabold mb-4">{isEn ? 'Job Alerts' : 'Alertes Emploi'}</h2>
          <p className="text-sm text-gray-600 mb-4">{isEn ? 'Send me an email when a [Role] offer is published in [City].' : 'Envoyez-moi un email quand une offre de [Metier] est publiee a [Ville].'}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder={isEn ? 'Role (ex: Data Analyst)' : 'Metier (ex: Data Analyst)'} />
            <input className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder={isEn ? 'City (ex: Douala)' : 'Ville (ex: Douala)'} />
            <button className="bg-black text-white rounded-xl px-4 py-3 font-extrabold text-sm hover:bg-gray-800 transition">
              {isEn ? 'Enable alert' : 'Activer l alerte'}
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
