"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { getStoredUser, mergeStoredUser } from '@/lib/session';

const USER_KEY = 'bolo237-user';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Experience = { poste: string; entreprise: string; dateDebut: string; dateFin: string; description: string };
type Formation = { diplome: string; ecole: string; annee: string };

type CountryPhoneOption = {
  code: string;
  flag: string;
  dialCode: string;
  placeholder: string;
};

const COUNTRY_PHONE_OPTIONS: CountryPhoneOption[] = [
  { code: 'CM', flag: '🇨🇲', dialCode: '+237', placeholder: '6XX XX XX XX' },
  { code: 'FR', flag: '🇫🇷', dialCode: '+33', placeholder: '6 12 34 56 78' },
  { code: 'DE', flag: '🇩🇪', dialCode: '+49', placeholder: '1512 3456789' },
  { code: 'CA', flag: '🇨🇦', dialCode: '+1', placeholder: '514 123 4567' },
  { code: 'US', flag: '🇺🇸', dialCode: '+1', placeholder: '415 123 4567' },
  { code: 'GB', flag: '🇬🇧', dialCode: '+44', placeholder: '7123 456789' },
  { code: 'BE', flag: '🇧🇪', dialCode: '+32', placeholder: '470 12 34 56' },
  { code: 'CH', flag: '🇨🇭', dialCode: '+41', placeholder: '79 123 45 67' },
];

function parseInternationalPhone(value: string): { countryCode: CountryPhoneOption['code']; localNumber: string } {
  const digits = value.replace(/\D/g, '');
  for (const option of COUNTRY_PHONE_OPTIONS) {
    const dialDigits = option.dialCode.replace('+', '');
    if (digits.startsWith(dialDigits)) {
      return {
        countryCode: option.code,
        localNumber: digits.slice(dialDigits.length),
      };
    }
  }
  return { countryCode: 'CM', localNumber: digits };
}

export default function ProfilCV() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  // Steps: 1=Info perso, 2=Experiences, 3=Formation, 4=Competences, 5=Resume/Preview
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Step 1: Personal info
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryPhoneOption['code']>('CM');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');

  // Step 2: Experiences
  const [experiences, setExperiences] = useState<Experience[]>([{ poste: '', entreprise: '', dateDebut: '', dateFin: '', description: '' }]);

  // Step 3: Formation
  const [formations, setFormations] = useState<Formation[]>([{ diplome: '', ecole: '', annee: '' }]);

  // Step 4: Skills + Languages
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [langInput, setLangInput] = useState('');
  const [languages, setLanguages] = useState<string[]>(['Francais']);

  // UI
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [isCertified, setIsCertified] = useState(false);
  const selectedCountry = COUNTRY_PHONE_OPTIONS.find((country) => country.code === selectedCountryCode) || COUNTRY_PHONE_OPTIONS[0];
  const cleanedLocalPhone = phone.replace(/\D/g, '');
  const internationalPhone = cleanedLocalPhone ? `${selectedCountry.dialCode}${cleanedLocalPhone}` : '';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(USER_KEY);
      if (raw) {
        const u = JSON.parse(raw);
        setUserId(u.id);
        setIsCertified(Boolean(u.isVerified));
        if (u.name) setFullName(u.name);
        if (u.email) setEmail(u.email);
      }
    } catch { /* */ }
  }, []);

  // Load existing profile
  useEffect(() => {
    if (!userId) return;
    fetch(`${API}/api/profiles/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.fullName) setFullName(data.fullName);
        if (data.title) setTitle(data.title);
        if (data.location) setCity(data.location);
        if (data.phone) {
          const parsed = parseInternationalPhone(data.phone);
          setSelectedCountryCode(parsed.countryCode);
          setPhone(parsed.localNumber);
        }
        if (data.email) setEmail(data.email);
        if (data.profile) setBio(data.profile);
        if (data.skillsText) setSkills(data.skillsText.split(',').map((s: string) => s.trim()).filter(Boolean));
        if (data.languagesText) setLanguages(data.languagesText.split(',').map((s: string) => s.trim()).filter(Boolean));
        if (data.experience) {
          try {
            const parsed = JSON.parse(data.experience);
            if (Array.isArray(parsed) && parsed.length > 0) setExperiences(parsed);
          } catch { /* */ }
        }
        if (data.education) {
          try {
            const parsed = JSON.parse(data.education);
            if (Array.isArray(parsed) && parsed.length > 0) setFormations(parsed);
          } catch { /* */ }
        }
      })
      .catch(() => { /* */ });
  }, [userId]);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) { setSkills([...skills, s]); setSkillInput(''); }
  };

  const addLang = () => {
    const l = langInput.trim();
    if (l && !languages.includes(l)) { setLanguages([...languages, l]); setLangInput(''); }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await fetch(`${API}/api/profiles/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName, title, location: city, phone: internationalPhone, email, profile: bio,
          experience: JSON.stringify(experiences.filter(e => e.poste)),
          education: JSON.stringify(formations.filter(f => f.diplome)),
          skillsText: skills.join(', '),
          languagesText: languages.join(', '),
        }),
      });
      const storedUser = getStoredUser();
      mergeStoredUser({
        ...(storedUser || {}),
        name: fullName,
        title,
        phone: internationalPhone,
        skills: skills.join(', '),
        cvUploaded: true,
        profileComplete: Boolean(fullName && title && city && internationalPhone && email && (bio || skills.length > 0 || experiences.some((e) => e.poste))),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* */ }
    finally { setSaving(false); }
  };

  const stepTitles = [
    isEn ? 'Personal Info' : 'Infos Personnelles',
    isEn ? 'Experience' : 'Experiences',
    isEn ? 'Education' : 'Formation',
    isEn ? 'Skills' : 'Competences',
    isEn ? 'Review & Save' : 'Relecture & Sauvegarde',
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-extrabold text-gray-700 hover:border-green-300 hover:text-green-700 transition"
          >
            <span aria-hidden="true">←</span>
            {isEn ? 'Back' : 'Retour'}
          </button>
          {isCertified && (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
              <span aria-hidden="true">✓</span>
              {isEn ? 'Certified profile' : 'Profil certifie'}
            </span>
          )}
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
            {isEn ? 'Build your CV step by step' : 'Creez votre CV etape par etape'}
          </h1>
          <p className="text-gray-500 text-sm">{isEn ? 'A complete profile attracts 3x more recruiters.' : 'Un profil complet attire 3 fois plus de recruteurs.'}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <button key={i} onClick={() => setStep(i + 1)}
              className={`h-2 flex-1 rounded-full transition-all cursor-pointer ${i + 1 <= step ? 'bg-green-500' : 'bg-gray-200 hover:bg-gray-300'}`} />
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-400 font-bold mb-6">
          <span>{isEn ? 'Step' : 'Etape'} {step}/{totalSteps}</span>
          <span>{stepTitles[step - 1]}</span>
        </div>

        {/* ── STEP 1: Personal Info ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">👤</div>
              <div>
                <h2 className="text-lg font-extrabold">{isEn ? 'Who are you?' : 'Qui etes-vous ?'}</h2>
                <p className="text-xs text-gray-500">{isEn ? 'Basic info recruiters will see first' : 'Les infos de base que les recruteurs verront en premier'}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Full name' : 'Nom complet'} *</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder={isEn ? 'e.g. Marie Ngono' : 'ex. Marie Ngono'}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Profile title' : 'Titre du profil'} *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={isEn ? 'e.g. Web Developer, Accountant, Plumber' : 'ex. Developpeur Web, Comptable, Plombier'}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
              <p className="text-[10px] text-gray-400 mt-1">{isEn ? 'This is what recruiters search for' : 'C\'est ce que les recruteurs recherchent'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'City' : 'Ville'}</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  placeholder={isEn ? 'e.g. Douala' : 'ex. Douala'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'Phone' : 'Telephone'}</label>
                <div className="flex gap-2">
                  <select
                    value={selectedCountryCode}
                    onChange={(e) => setSelectedCountryCode(e.target.value as CountryPhoneOption['code'])}
                    className="w-[120px] px-2 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-white"
                  >
                    {COUNTRY_PHONE_OPTIONS.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.dialCode}
                      </option>
                    ))}
                  </select>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d\s()-]/g, ''))}
                    placeholder={selectedCountry.placeholder}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">{isEn ? 'About me (short bio)' : 'A propos de moi (bio courte)'}</label>
              <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
                placeholder={isEn ? 'Describe yourself in 2-3 sentences...' : 'Presentez-vous en 2-3 phrases...'}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none resize-none" />
            </div>
          </div>
        )}

        {/* ── STEP 2: Experiences ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">💼</div>
              <div>
                <h2 className="text-lg font-extrabold">{isEn ? 'Work experience' : 'Experiences professionnelles'}</h2>
                <p className="text-xs text-gray-500">{isEn ? 'Start with your most recent job' : 'Commencez par votre emploi le plus recent'}</p>
              </div>
            </div>

            {experiences.map((exp, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">{isEn ? 'Experience' : 'Experience'} #{i + 1}</span>
                  {experiences.length > 1 && (
                    <button onClick={() => setExperiences(experiences.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
                  )}
                </div>
                <input type="text" value={exp.poste} onChange={(e) => { const n = [...experiences]; n[i].poste = e.target.value; setExperiences(n); }}
                  placeholder={isEn ? 'Job title (e.g. Accountant)' : 'Intitule du poste (ex. Comptable)'}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                <input type="text" value={exp.entreprise} onChange={(e) => { const n = [...experiences]; n[i].entreprise = e.target.value; setExperiences(n); }}
                  placeholder={isEn ? 'Company name' : 'Nom de l\'entreprise'}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={exp.dateDebut} onChange={(e) => { const n = [...experiences]; n[i].dateDebut = e.target.value; setExperiences(n); }}
                    placeholder={isEn ? 'Start (e.g. Jan 2022)' : 'Debut (ex. Jan 2022)'}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                  <input type="text" value={exp.dateFin} onChange={(e) => { const n = [...experiences]; n[i].dateFin = e.target.value; setExperiences(n); }}
                    placeholder={isEn ? 'End (or Present)' : 'Fin (ou Aujourd\'hui)'}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                </div>
                <textarea rows={2} value={exp.description} onChange={(e) => { const n = [...experiences]; n[i].description = e.target.value; setExperiences(n); }}
                  placeholder={isEn ? 'Briefly describe your role and achievements...' : 'Decrivez brievement vos taches et realisations...'}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm resize-none" />
              </div>
            ))}

            <button onClick={() => setExperiences([...experiences, { poste: '', entreprise: '', dateDebut: '', dateFin: '', description: '' }])}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-bold text-gray-500 hover:border-green-400 hover:text-green-600 transition">
              + {isEn ? 'Add another experience' : 'Ajouter une experience'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              {isEn ? 'No experience yet? No problem — skip this step.' : 'Pas encore d\'experience ? Pas de souci — passez cette etape.'}
            </p>
          </div>
        )}

        {/* ── STEP 3: Education ── */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-xl">🎓</div>
              <div>
                <h2 className="text-lg font-extrabold">{isEn ? 'Education' : 'Formation'}</h2>
                <p className="text-xs text-gray-500">{isEn ? 'Your diplomas and certifications' : 'Vos diplomes et certifications'}</p>
              </div>
            </div>

            {formations.map((f, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">{isEn ? 'Education' : 'Formation'} #{i + 1}</span>
                  {formations.length > 1 && (
                    <button onClick={() => setFormations(formations.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
                  )}
                </div>
                <input type="text" value={f.diplome} onChange={(e) => { const n = [...formations]; n[i].diplome = e.target.value; setFormations(n); }}
                  placeholder={isEn ? 'Degree / Diploma (e.g. BTS Accounting)' : 'Diplome (ex. BTS Comptabilite)'}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                <input type="text" value={f.ecole} onChange={(e) => { const n = [...formations]; n[i].ecole = e.target.value; setFormations(n); }}
                  placeholder={isEn ? 'School / Institution' : 'Ecole / Etablissement'}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                <input type="text" value={f.annee} onChange={(e) => { const n = [...formations]; n[i].annee = e.target.value; setFormations(n); }}
                  placeholder={isEn ? 'Year (e.g. 2020)' : 'Annee (ex. 2020)'}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
              </div>
            ))}

            <button onClick={() => setFormations([...formations, { diplome: '', ecole: '', annee: '' }])}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-bold text-gray-500 hover:border-green-400 hover:text-green-600 transition">
              + {isEn ? 'Add another education' : 'Ajouter une formation'}
            </button>
          </div>
        )}

        {/* ── STEP 4: Skills & Languages ── */}
        {step === 4 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl">⚡</div>
              <div>
                <h2 className="text-lg font-extrabold">{isEn ? 'Skills & Languages' : 'Competences & Langues'}</h2>
                <p className="text-xs text-gray-500">{isEn ? 'What can you do? Which languages do you speak?' : 'Que savez-vous faire ? Quelles langues parlez-vous ?'}</p>
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-2 block">{isEn ? 'Skills' : 'Competences'}</label>
              <div className="flex gap-2">
                <input type="text" value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                  placeholder={isEn ? 'e.g. Excel, Accounting, React...' : 'ex. Excel, Comptabilite, React...'}
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                <button onClick={addSkill} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700">+</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold">
                    {s}
                    <button onClick={() => setSkills(skills.filter(sk => sk !== s))} className="hover:text-red-500">×</button>
                  </span>
                ))}
                {skills.length === 0 && <p className="text-xs text-gray-400">{isEn ? 'Add at least 3 skills' : 'Ajoutez au moins 3 competences'}</p>}
              </div>
            </div>

            {/* Languages */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-2 block">{isEn ? 'Languages' : 'Langues'}</label>
              <div className="flex gap-2">
                <input type="text" value={langInput}
                  onChange={(e) => setLangInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLang(); } }}
                  placeholder={isEn ? 'e.g. English, French...' : 'ex. Anglais, Francais...'}
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm" />
                <button onClick={addLang} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700">+</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {languages.map((l) => (
                  <span key={l} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                    {l}
                    <button onClick={() => setLanguages(languages.filter(la => la !== l))} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Review & Save ── */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">✅</div>
                <div>
                  <h2 className="text-lg font-extrabold">{isEn ? 'Review your CV' : 'Relisez votre CV'}</h2>
                  <p className="text-xs text-gray-500">{isEn ? 'Check everything before saving' : 'Verifiez tout avant de sauvegarder'}</p>
                </div>
              </div>

              {/* Preview */}
              <div className="border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-xl font-extrabold">{fullName || '—'}</h3>
                  <p className="text-sm font-bold text-green-700">{title || '—'}</p>
                  <p className="text-xs text-gray-500">{city} {internationalPhone && `• ${internationalPhone}`} {email && `• ${email}`}</p>
                </div>
                {bio && <div><p className="text-xs font-bold text-gray-400 uppercase mb-1">{isEn ? 'About' : 'Profil'}</p><p className="text-sm text-gray-700">{bio}</p></div>}

                {experiences.some(e => e.poste) && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isEn ? 'Experience' : 'Experiences'}</p>
                    {experiences.filter(e => e.poste).map((e, i) => (
                      <div key={i} className="mb-2">
                        <p className="text-sm font-bold">{e.poste} {e.entreprise && `— ${e.entreprise}`}</p>
                        <p className="text-xs text-gray-500">{e.dateDebut} {e.dateFin && `→ ${e.dateFin}`}</p>
                        {e.description && <p className="text-xs text-gray-600 mt-1">{e.description}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {formations.some(f => f.diplome) && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isEn ? 'Education' : 'Formation'}</p>
                    {formations.filter(f => f.diplome).map((f, i) => (
                      <div key={i} className="mb-1">
                        <p className="text-sm font-bold">{f.diplome}</p>
                        <p className="text-xs text-gray-500">{f.ecole} {f.annee && `(${f.annee})`}</p>
                      </div>
                    ))}
                  </div>
                )}

                {skills.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isEn ? 'Skills' : 'Competences'}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(s => <span key={s} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold">{s}</span>)}
                    </div>
                  </div>
                )}

                {languages.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">{isEn ? 'Languages' : 'Langues'}</p>
                    <p className="text-sm text-gray-700">{languages.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleSave} disabled={saving}
              className="w-full bg-green-600 text-white font-extrabold py-4 rounded-xl hover:bg-green-700 transition shadow-lg text-base disabled:opacity-60">
              {saving ? (isEn ? 'Saving...' : 'Sauvegarde...') : saved ? (isEn ? 'Saved!' : 'Sauvegarde !') : (isEn ? 'Save my CV' : 'Sauvegarder mon CV')} {saved ? '✓' : '💾'}
            </button>

            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-green-700">{isEn ? 'Your CV has been saved! Recruiters can now find you.' : 'Votre CV a ete sauvegarde ! Les recruteurs peuvent maintenant vous trouver.'}</p>
                <Link href={localizePath('/dashboard')} className="text-sm font-bold text-green-600 hover:underline mt-2 inline-block">
                  {isEn ? '← Back to dashboard' : '← Retour au tableau de bord'}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition disabled:opacity-30"
          >
            ← {isEn ? 'Previous' : 'Precedent'}
          </button>

          {step < totalSteps ? (
            <button
              onClick={() => setStep(Math.min(totalSteps, step + 1))}
              className="px-6 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition"
            >
              {isEn ? 'Next' : 'Suivant'} →
            </button>
          ) : (
            <Link href={localizePath('/dashboard')} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition">
              {isEn ? 'Back to dashboard' : 'Tableau de bord'}
            </Link>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
