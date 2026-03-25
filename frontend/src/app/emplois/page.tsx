"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { fetchJobs, fetchUserSavedJobs, removeUserSavedJob, saveUserJob, type ApiJob } from '@/lib/api';
import { useApi } from '@/lib/useApi';

// ── Types ─────────────────────────────────────────────────────────
type Offre = {
  id: number;
  titre: string;
  entreprise: string;
  logoInitiales: string;
  logoColor: string;
  lieu: string;
  region: string;
  teletravail: string;
  contrat: string;
  secteur: string;
  niveau: string;
  salaire: string | null;
  description: string;
  heures: string;
  candidatureRapide: boolean;
  nouveau: boolean;
  saved: boolean;
};

const LOGO_COLORS = ['#7C3AED', '#059669', '#D97706', '#DC2626', '#EA580C', '#2563EB', '#0891B2'];

function apiJobToOffre(job: ApiJob, index: number): Offre {
  const hours = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60));
  let heures: string;
  if (hours < 1) heures = "À l'instant";
  else if (hours < 24) heures = `Il y a ${hours}h`;
  else if (hours < 168) heures = `Il y a ${Math.floor(hours / 24)} jour${Math.floor(hours / 24) > 1 ? 's' : ''}`;
  else heures = `Il y a ${Math.floor(hours / 168)} semaine${Math.floor(hours / 168) > 1 ? 's' : ''}`;

  return {
    id: job.id,
    titre: job.title,
    entreprise: job.company,
    logoInitiales: job.company.slice(0, 2).toUpperCase(),
    logoColor: LOGO_COLORS[index % LOGO_COLORS.length],
    lieu: job.location,
    region: job.location.split(',')[0]?.trim() || '',
    teletravail: 'Non',
    contrat: 'CDI',
    secteur: 'Général',
    niveau: 'Bac+3',
    salaire: job.salary,
    description: job.description,
    heures,
    candidatureRapide: index % 2 === 0,
    nouveau: hours < 72,
    saved: false,
  };
}

// ── Mock data (fallback si backend indisponible) ──────────────────
const MOCK_OFFRES: Offre[] = [
  {
    id: 1, titre: 'Développeur Web React.js', entreprise: 'TechCamer', logoInitiales: 'TC', logoColor: '#7C3AED',
    lieu: 'Douala, Akwa', region: 'Littoral', teletravail: 'Partiel', contrat: 'CDI', secteur: 'Informatique & Tech', niveau: 'Bac+3',
    salaire: '300 000 – 400 000 FCFA', description: 'Nous recherchons un développeur React.js passionné pour rejoindre notre équipe. Vous travaillerez sur des projets innovants pour des clients locaux et internationaux.',
    heures: 'Il y a 2h', candidatureRapide: true, nouveau: true, saved: false,
  },
  {
    id: 3, titre: 'Comptable Junior (H/F)', entreprise: 'K-Finance SA', logoInitiales: 'KF', logoColor: '#059669',
    lieu: 'Douala, Bonanjo', region: 'Littoral', teletravail: 'Non', contrat: 'Stage', secteur: 'Finance & Banque', niveau: 'Bac+2',
    salaire: null, description: 'Stage de 6 mois en comptabilité générale. Saisie, rapprochement bancaire, préparation des bilans. Encadrement par un senior.',
    heures: 'Il y a 1 jour', candidatureRapide: false, nouveau: true, saved: false,
  },
  {
    id: 5, titre: 'Responsable Marketing Digital', entreprise: 'MTN Cameroun', logoInitiales: 'MT', logoColor: '#D97706',
    lieu: 'Yaoundé, Bastos', region: 'Centre', teletravail: 'Partiel', contrat: 'CDI', secteur: 'Télécommunications', niveau: 'Bac+4/5',
    salaire: '450 000 – 600 000 FCFA', description: 'Pilotage de la stratégie de communication digitale, gestion des réseaux sociaux, campagnes publicitaires et analyse des performances.',
    heures: 'Il y a 3 jours', candidatureRapide: true, nouveau: false, saved: false,
  },
  {
    id: 7, titre: 'Ingénieur Génie Civil', entreprise: 'BATIGROUP SA', logoInitiales: 'BG', logoColor: '#DC2626',
    lieu: 'Bafoussam', region: 'Ouest', teletravail: 'Non', contrat: 'CDD', secteur: 'BTP & Construction', niveau: 'Bac+5',
    salaire: '350 000 – 500 000 FCFA', description: 'Supervision de chantiers, coordination des équipes, contrôle qualité et respect des délais sur des projets d\'infrastructure publique.',
    heures: 'Il y a 5 jours', candidatureRapide: false, nouveau: false, saved: false,
  },
  {
    id: 8, titre: 'Data Analyst', entreprise: 'Orange Cameroun', logoInitiales: 'OC', logoColor: '#EA580C',
    lieu: 'Douala', region: 'Littoral', teletravail: 'Oui', contrat: 'CDI', secteur: 'Télécommunications', niveau: 'Bac+4/5',
    salaire: '400 000 – 550 000 FCFA', description: 'Analyse des données clients, modélisation prédictive, dashboards et rapports de performance pour la direction commerciale.',
    heures: 'Il y a 1 semaine', candidatureRapide: true, nouveau: false, saved: false,
  },
];

// ── Accordion section ─────────────────────────────────────────────
function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '16px' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px', textAlign: 'left' }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A' }}>{title}</span>
        <span style={{ color: '#94A3B8', fontSize: '1rem', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function FilterCheckbox({ label, count, color = '#7C3AED' }: { label: string; count?: number; color?: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <label
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', cursor: 'pointer', gap: '8px' }}
      onClick={() => setChecked(!checked)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div style={{
          width: '17px', height: '17px', borderRadius: '4px', border: '2px solid ' + (checked ? color : '#CBD5E1'),
          background: checked ? color : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
        </div>
        <span style={{ fontSize: '0.85rem', color: '#374151' }}>{label}</span>
      </div>
      {count !== undefined && (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '1px 8px', borderRadius: '10px', flexShrink: 0 }}>
          {count}
        </span>
      )}
    </label>
  );
}

// ── Page principale ───────────────────────────────────────────────
export default function EmploisFormels() {
  const { localizePath } = useLocale();
  const [userId, setUserId] = useState<number>(0);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [alertActive, setAlertActive] = useState(false);
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');

  const handleSearch = () => {
    setAppliedSearch(searchInput.trim());
    setAppliedLocation(locationInput.trim());
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bolo237-user');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setUserId(Number(parsed?.id || 0));
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    const loadSavedJobs = async () => {
      if (!userId) return;
      try {
        const jobs = await fetchUserSavedJobs(userId);
        setSavedIds(jobs.map((job) => job.id));
      } catch {
        setSavedIds([]);
      }
    };

    loadSavedJobs();
  }, [userId]);

  // Fetch depuis le backend, fallback sur mock
  const { data: jobsData } = useApi(
    () => fetchJobs({
      limit: 20,
      status: 'APPROVED',
      ...(appliedSearch ? { search: appliedSearch } : {}),
      ...(appliedLocation ? { location: appliedLocation } : {}),
    }),
    null,
    [appliedSearch, appliedLocation]
  );

  const OFFRES: Offre[] = jobsData && jobsData.jobs.length > 0
    ? jobsData.jobs.map((j, i) => apiJobToOffre(j, i))
    : MOCK_OFFRES;

  const toggleSave = async (id: number) => {
    const isSaved = savedIds.includes(id);

    setSavedIds((prev) => (isSaved ? prev.filter((x) => x !== id) : [...prev, id]));

    if (!userId) return;

    try {
      if (isSaved) {
        await removeUserSavedJob(userId, id);
      } else {
        await saveUserJob(userId, id);
      }
    } catch {
      setSavedIds((prev) => (isSaved ? [...prev, id] : prev.filter((x) => x !== id)));
    }
  };

  const toggleChip = (chip: string) => {
    setActiveChips(prev => prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F8FA' }}>
      <Header />

      {/* ── Barre de recherche principale ─────────────────────── */}
      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>        <div className="max-w-6xl mx-auto" style={{ padding: '8px 24px 0' }}>
          <Link
            href={localizePath('/')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-purple-700 transition"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour a l&apos;accueil
          </Link>
        </div>        <div className="max-w-6xl mx-auto" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {/* Champ poste */}
            <div style={{ flex: 2, minWidth: '220px', position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                placeholder="Poste, compétence, entreprise..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ width: '100%', padding: '13px 16px 13px 44px', border: '1.5px solid #E2E8F0', borderRadius: '10px', outline: 'none', fontSize: '0.9rem', color: '#0F172A', boxSizing: 'border-box' }}
              />
            </div>
            {/* Champ lieu */}
            <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              </svg>
              <input
                type="text"
                placeholder="Ville ou région..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ width: '100%', padding: '13px 16px 13px 44px', border: '1.5px solid #E2E8F0', borderRadius: '10px', outline: 'none', fontSize: '0.9rem', color: '#0F172A', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={handleSearch}
              style={{ background: '#7C3AED', color: 'white', padding: '13px 28px', borderRadius: '10px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
            >
              Trouver un emploi
            </button>
          </div>

          {/* Chips filtres rapides */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
            {[
              { label: 'Candidature rapide', count: 45 },
              { label: 'Date de publication' },
              { label: 'Télétravail' },
              { label: 'Salaire' },
            ].map(({ label, count }) => (
              <button
                key={label}
                onClick={() => toggleChip(label)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1.5px solid ' + (activeChips.includes(label) ? '#7C3AED' : '#E2E8F0'),
                  background: activeChips.includes(label) ? '#EDE9FE' : 'white',
                  color: activeChips.includes(label) ? '#6D28D9' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                + {label}
                {count && <span style={{ background: activeChips.includes(label) ? '#7C3AED' : '#E2E8F0', color: activeChips.includes(label) ? 'white' : '#64748B', padding: '1px 7px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700 }}>{count}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bannière alerte (optionnelle) ─────────────────────── */}
      {!alertActive && (
        <div style={{ background: '#F0FDF4', borderBottom: '1px solid #BBF7D0' }}>
          <div className="max-w-6xl mx-auto" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <p style={{ fontSize: '0.88rem', color: '#065F46', margin: 0 }}>
              <strong>Vous ne trouvez pas ?</strong> Activez les alertes emploi et recevez les nouvelles offres par email.
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => setAlertActive(true)}
                style={{ background: '#059669', color: 'white', padding: '8px 18px', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.83rem' }}
              >
                Activer les alertes
              </button>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '1.2rem' }}>×</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Corps principal ───────────────────────────────────── */}
      <div className="max-w-6xl mx-auto" style={{ padding: '24px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

        {/* ── Sidebar filtres ──────────────────────────────────── */}
        <aside style={{ width: '260px', flexShrink: 0, background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px', position: 'sticky', top: '80px' }} className="hidden md:block">

          <FilterSection title="Date de publication">
            <FilterCheckbox label="Moins de 24h" count={45} />
            <FilterCheckbox label="Moins de 7 jours" count={312} />
            <FilterCheckbox label="Moins de 30 jours" count={987} />
          </FilterSection>

          <FilterSection title="Télétravail">
            <FilterCheckbox label="Télétravail partiel" count={126} />
            <FilterCheckbox label="100% Télétravail" count={38} />
          </FilterSection>

          <FilterSection title="Salaire mensuel">
            <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '10px' }}>Fixez le salaire minimum souhaité.</div>
            <button style={{ width: '100%', padding: '10px', border: '1.5px solid #7C3AED', borderRadius: '8px', color: '#7C3AED', fontWeight: 700, background: '#EDE9FE', cursor: 'pointer', fontSize: '0.85rem' }}>
              Définir mon salaire
            </button>
          </FilterSection>

          <FilterSection title="Secteur d'activité">
            <FilterCheckbox label="Informatique & Tech" count={124} />
            <FilterCheckbox label="Finance & Banque" count={89} />
            <FilterCheckbox label="Télécommunications" count={73} />
            <FilterCheckbox label="BTP & Construction" count={57} />
            <FilterCheckbox label="Santé" count={42} />
            <FilterCheckbox label="Commerce & Vente" count={118} />
            <button style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', padding: '4px 0' }}>+ Voir plus</button>
          </FilterSection>

          <FilterSection title="Région">
            <FilterCheckbox label="Littoral (Douala)" count={412} />
            <FilterCheckbox label="Centre (Yaoundé)" count={289} />
            <FilterCheckbox label="Ouest (Bafoussam)" count={87} />
            <FilterCheckbox label="Sud-Ouest (Buea)" count={56} />
            <FilterCheckbox label="Nord (Garoua)" count={34} />
          </FilterSection>

          <FilterSection title="Niveau d'études">
            <FilterCheckbox label="Bac et moins" count={67} />
            <FilterCheckbox label="Bac+2" count={183} />
            <FilterCheckbox label="Bac+3" count={241} />
            <FilterCheckbox label="Bac+4/5" count={312} />
            <FilterCheckbox label="Doctorat" count={28} />
          </FilterSection>

          <FilterSection title="Type de contrat">
            <FilterCheckbox label="CDI" count={543} />
            <FilterCheckbox label="CDD" count={287} />
            <FilterCheckbox label="Stage" count={134} />
            <FilterCheckbox label="Alternance" count={67} />
            <FilterCheckbox label="Freelance" count={89} />
          </FilterSection>

          <FilterSection title="Temps de travail" defaultOpen={false}>
            <FilterCheckbox label="Temps plein" count={823} />
            <FilterCheckbox label="Temps partiel" count={178} />
          </FilterSection>

          {/* Jobs populaires */}
          <div style={{ marginTop: '4px' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Recherches populaires</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['Développeur', 'Comptable', 'Commercial', 'Marketing', 'Ingénieur', 'Analyste'].map(j => (
                <span key={j} style={{ background: '#F1F5F9', color: '#374151', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 }}>{j}</span>
              ))}
            </div>
          </div>

          {/* Villes populaires */}
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Villes</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['Douala', 'Yaoundé', 'Bafoussam', 'Buea', 'Garoua'].map(v => (
                <span key={v} style={{ background: '#F1F5F9', color: '#374151', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 }}>{v}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Liste des offres ─────────────────────────────────── */}
        <section style={{ flex: 1, minWidth: 0 }}>
          {/* Entête résultats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 600, margin: 0 }}>
              <strong style={{ color: '#7C3AED' }}>{OFFRES.length}</strong> offres d&apos;emploi au Cameroun
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Trier par :</span>
              <select style={{ fontSize: '0.82rem', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', color: '#374151', background: 'white', outline: 'none', cursor: 'pointer' }}>
                <option>Pertinence</option>
                <option>Date de publication</option>
                <option>Salaire croissant</option>
                <option>Salaire décroissant</option>
              </select>
            </div>
          </div>

          {/* Cartes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {OFFRES.map((offre) => (
              <div
                key={offre.id}
                style={{ background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px 22px', transition: 'all 0.15s', position: 'relative' }}
                className="hover:border-violet-200 hover:shadow-md"
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {/* Contenu gauche */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Badges top */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                      {offre.candidatureRapide && (
                        <span style={{ background: '#EDE9FE', color: '#6D28D9', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>
                          Candidature rapide
                        </span>
                      )}
                      {offre.nouveau && (
                        <span style={{ background: '#DBEAFE', color: '#1D4ED8', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', letterSpacing: '0.05em' }}>
                          NOUVEAU
                        </span>
                      )}
                    </div>

                    {/* Titre */}
                    <Link
                      href={localizePath(`/annonce/${offre.id}`)}
                      style={{ fontSize: '1.05rem', fontWeight: 800, color: '#7C3AED', textDecoration: 'none', display: 'block', marginBottom: '6px', lineHeight: 1.3 }}
                    >
                      {offre.titre}
                    </Link>

                    {/* Infos entreprise */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '10px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.83rem', color: '#374151' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16M3 21h18M9 21V11h6v10" /></svg>
                        <strong>{offre.entreprise}</strong>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.83rem', color: '#64748B' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>
                        {offre.lieu}
                      </span>
                      {offre.teletravail !== 'Non' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.83rem', color: '#64748B' }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6" /></svg>
                          Télétravail {offre.teletravail.toLowerCase()}
                        </span>
                      )}
                      {offre.salaire ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.83rem', color: '#059669', fontWeight: 600 }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
                          {offre.salaire}
                        </span>
                      ) : (
                        <button style={{ background: 'none', border: 'none', color: '#7C3AED', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                          Voir le salaire
                        </button>
                      )}
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {offre.description}
                    </p>

                    {/* Footer carte */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{offre.heures}</span>
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>·</span>
                      <span style={{ fontSize: '0.78rem', background: '#F1F5F9', color: '#475569', padding: '2px 9px', borderRadius: '5px', fontWeight: 600 }}>{offre.contrat}</span>
                    </div>
                  </div>

                  {/* Logo + actions droite */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', flexShrink: 0 }}>
                    {/* Logo entreprise */}
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '10px', background: offre.logoColor + '18',
                      border: '1.5px solid ' + offre.logoColor + '30',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: offre.logoColor, fontWeight: 900, fontSize: '0.9rem',
                    }}>
                      {offre.logoInitiales}
                    </div>
                    {/* Cœur sauvegarder */}
                    <button
                      onClick={() => toggleSave(offre.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      title={savedIds.includes(offre.id) ? 'Retirer des favoris' : 'Sauvegarder'}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill={savedIds.includes(offre.id) ? '#7C3AED' : 'none'} stroke={savedIds.includes(offre.id) ? '#7C3AED' : '#CBD5E1'} strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bannière CV */}
          <div style={{ marginTop: '24px', background: 'linear-gradient(135deg, #5B21B6, #7C3AED)', borderRadius: '12px', padding: '24px 28px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: 'white', fontWeight: 800, fontSize: '1rem', margin: '0 0 4px' }}>Déposez votre CV — soyez trouvé par les entreprises</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.83rem', margin: 0 }}>850+ entreprises consultent notre CVthèque chaque mois.</p>
            </div>
            <Link href={localizePath('/profil')} style={{ marginLeft: 'auto', background: 'white', color: '#7C3AED', padding: '11px 22px', borderRadius: '9px', fontWeight: 800, textDecoration: 'none', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Déposer mon CV →
            </Link>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '28px' }}>
            {[1, 2, 3, '...', 22].map((p, i) => (
              <button key={i} style={{
                width: '38px', height: '38px', borderRadius: '8px',
                border: '1.5px solid ' + (p === 1 ? '#7C3AED' : '#E2E8F0'),
                background: p === 1 ? '#7C3AED' : 'white',
                color: p === 1 ? 'white' : '#374151',
                fontWeight: p === 1 ? 700 : 400,
                cursor: 'pointer', fontSize: '0.85rem',
              }}>
                {p}
              </button>
            ))}
          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}
