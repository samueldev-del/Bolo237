"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { type ApiArtisanProfile, fetchArtisanDirectory } from '@/lib/api';

const DIRECTORY_PAGE_SIZE = 12;

// ── Catégories ────────────────────────────────────────────────────
const categories = [
  { icon: '🏗️', label: 'Bâtiment & Chantiers' },
  { icon: '🧹', label: 'Ménage & Entretien' },
  { icon: '🚗', label: 'Transport & Livraison' },
  { icon: '🛒', label: 'Commerce & Vente' },
  { icon: '🔨', label: 'Artisanat' },
  { icon: '👶', label: "Garde d'enfants" },
  { icon: '🍽️', label: 'Restauration' },
  { icon: '📱', label: 'Tech & Dépannage' },
  { icon: '💇', label: 'Coiffure & Beauté' },
  { icon: '📚', label: 'Cours Particuliers' },
  { icon: '🌱', label: 'Jardinage' },
  { icon: '🔐', label: 'Gardiennage' },
];

function getWhatsAppHref(phone?: string | null): string | null {
  const cleaned = String(phone || '').replace(/\s+/g, '').replace(/^\+/, '');
  return cleaned ? `https://wa.me/${cleaned}` : null;
}

function getProfileName(artisan: ApiArtisanProfile): string {
  return String(artisan.fullName || artisan.name || 'Artisan').trim();
}

function getCategoryIcon(label?: string | null): string {
  const normalized = String(label || '').toLowerCase();
  const match = categories.find((entry) => normalized.includes(entry.label.toLowerCase().split(' ')[0]));
  return match?.icon || '🔨';
}

export default function PetitsBoulots() {
  const { localizePath } = useLocale();
  const [categorieActive, setCategorieActive] = useState<string | null>(null);
  const [searchQuartier, setSearchQuartier] = useState('');
  const [searchService, setSearchService] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [artisans, setArtisans] = useState<ApiArtisanProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'services' | 'portfolio'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalArtisans, setTotalArtisans] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const baseFilters = useMemo(() => ({
    categorie: categorieActive || undefined,
    location: locationFilter || undefined,
    service: serviceFilter.trim() || undefined,
    sortBy,
  }), [categorieActive, locationFilter, serviceFilter, sortBy]);

  useEffect(() => {
    let cancelled = false;

    const loadArtisans = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setCurrentPage(1);

      try {
        const directory = await fetchArtisanDirectory({
          ...baseFilters,
          page: 1,
          limit: DIRECTORY_PAGE_SIZE,
        });

        if (!cancelled) {
          setArtisans(directory.items);
          setTotalArtisans(directory.pagination.total);
          setHasMore(directory.pagination.page < directory.pagination.totalPages);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Erreur lors du chargement de l annuaire';
          setErrorMessage(message);
          setArtisans([]);
          setTotalArtisans(0);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadArtisans();

    return () => {
      cancelled = true;
    };
  }, [baseFilters]);

  const handleLoadMore = async () => {
    if (isLoading || isLoadingMore || !hasMore) return;

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    setErrorMessage(null);

    try {
      const directory = await fetchArtisanDirectory({
        ...baseFilters,
        page: nextPage,
        limit: DIRECTORY_PAGE_SIZE,
      });

      setArtisans((prev) => [...prev, ...directory.items]);
      setCurrentPage(nextPage);
      setTotalArtisans(directory.pagination.total);
      setHasMore(directory.pagination.page < directory.pagination.totalPages);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement supplementaire';
      setErrorMessage(message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filtered = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    if (!normalizedQuery) return artisans;

    return artisans.filter((artisan) => {
      const joinedServices = artisan.services.map((service) => service.name).join(' ');
      const searchable = [
        artisan.fullName,
        artisan.name,
        artisan.title,
        artisan.location,
        artisan.profile,
        joinedServices,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [artisans, searchTerm]);

  const handleSearch = () => {
    setLocationFilter(searchQuartier.trim());
    setServiceFilter(searchService.trim());
  };

  const handleResetFilters = () => {
    setCategorieActive(null);
    setSearchQuartier('');
    setSearchService('');
    setSearchTerm('');
    setLocationFilter('');
    setServiceFilter('');
    setSortBy('recent');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <BreadcrumbJsonLd
        items={[
          { name: { fr: 'Accueil', en: 'Home' }, path: '/' },
          { name: { fr: 'Services', en: 'Services' }, path: '/petits-boulots' },
        ]}
      />
      <Header />

      {/* ── Header eBay-style ─────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #065F46, #059669)', padding: '32px 24px' }}>
        <div className="max-w-6xl mx-auto">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h1 style={{ color: 'white', fontWeight: 900, fontSize: '1.6rem', margin: 0 }}>Annuaire des Artisans</h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', margin: '4px 0 0' }}>
                Consultez les profils verifies, services et portfolios, puis contactez directement sur WhatsApp.
              </p>
            </div>
            <Link
              href={localizePath('/publier')}
              style={{ marginLeft: 'auto', background: 'white', color: '#059669', padding: '11px 22px', borderRadius: '10px', fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
            >
              + Referencer mon service
            </Link>
          </div>

          {/* Recherche par quartier */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <input
              type="text"
              placeholder="🔍  Rechercher un artisan, un metier, un service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 2, minWidth: '180px', padding: '11px 16px', border: '1.5px solid #E2E8F0', borderRadius: '10px', outline: 'none', fontSize: '0.9rem', color: '#0F172A' }}
            />
            <input
              type="text"
              placeholder="📍  Quartier, ville..."
              value={searchQuartier}
              onChange={e => setSearchQuartier(e.target.value)}
              style={{ flex: 1, minWidth: '150px', padding: '11px 16px', border: '1.5px solid #E2E8F0', borderRadius: '10px', outline: 'none', fontSize: '0.9rem', color: '#0F172A' }}
            />
            <input
              type="text"
              placeholder="🛠️  Service specifique (ex: plomberie)..."
              value={searchService}
              onChange={(e) => setSearchService(e.target.value)}
              style={{ flex: 1, minWidth: '150px', padding: '11px 16px', border: '1.5px solid #E2E8F0', borderRadius: '10px', outline: 'none', fontSize: '0.9rem', color: '#0F172A' }}
            />
            <button
              onClick={handleSearch}
              style={{ background: '#059669', color: 'white', padding: '11px 24px', borderRadius: '10px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Rechercher
            </button>
          </div>
        </div>
      </div>

      {/* ── Catégories pills ─────────────────────────────────────── */}
      <div style={{ background: 'white', borderBottom: '1px solid #F1F5F9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflowX: 'auto' }}>
        <div className="max-w-6xl mx-auto px-4" style={{ display: 'flex', gap: '8px', padding: '14px 24px', overflowX: 'auto', flexWrap: 'nowrap' }}>
          <button
            onClick={() => setCategorieActive(null)}
            style={{
              padding: '7px 16px',
              borderRadius: '20px',
              border: '1.5px solid ' + (categorieActive === null ? '#059669' : '#E2E8F0'),
              background: categorieActive === null ? '#059669' : 'white',
              color: categorieActive === null ? 'white' : '#374151',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Toutes ({artisans.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.label}
              onClick={() => setCategorieActive(categorieActive === cat.label ? null : cat.label)}
              style={{
                padding: '7px 16px',
                borderRadius: '20px',
                border: '1.5px solid ' + (categorieActive === cat.label ? '#059669' : '#E2E8F0'),
                background: categorieActive === cat.label ? '#ECFDF5' : 'white',
                color: categorieActive === cat.label ? '#059669' : '#374151',
                fontWeight: categorieActive === cat.label ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu principal ──────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

        {/* Filtres latéraux */}
        <aside style={{ width: '220px', flexShrink: 0 }} className="hidden md:block">
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '22px', position: 'sticky', top: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Filtres</h2>
              <button
                onClick={handleResetFilters}
                style={{ border: 'none', background: 'transparent', color: '#059669', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Reinitialiser
              </button>
            </div>

            <div style={{ marginBottom: '18px', paddingBottom: '18px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Categorie active</h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
                {categorieActive ? `${getCategoryIcon(categorieActive)} ${categorieActive}` : 'Toutes les categories'}
              </p>
            </div>

            <div style={{ marginBottom: '18px', paddingBottom: '18px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Ville</h3>
              <input
                type="text"
                placeholder="Douala, Yaounde..."
                value={searchQuartier}
                onChange={(e) => setSearchQuartier(e.target.value)}
                style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #E2E8F0', borderRadius: '9px', outline: 'none', fontSize: '0.82rem', color: '#0F172A', background: 'white' }}
              />
            </div>

            <div style={{ marginBottom: '18px', paddingBottom: '18px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Service</h3>
              <input
                type="text"
                placeholder="Plomberie, electricite..."
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #E2E8F0', borderRadius: '9px', outline: 'none', fontSize: '0.82rem', color: '#0F172A', background: 'white' }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Tri</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'services' | 'portfolio')}
                style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #E2E8F0', borderRadius: '9px', outline: 'none', fontSize: '0.82rem', color: '#374151', background: 'white' }}
              >
                <option value="recent">Plus recents</option>
                <option value="services">Plus de services</option>
                <option value="portfolio">Portfolio le plus fourni</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSearch}
                style={{ flex: 1, background: '#059669', border: 'none', color: 'white', borderRadius: '10px', padding: '10px 12px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Appliquer
              </button>
              <button
                onClick={handleResetFilters}
                style={{ flex: 1, background: 'white', border: '1.5px solid #E2E8F0', color: '#64748B', borderRadius: '10px', padding: '10px 12px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Effacer
              </button>
            </div>
          </div>

          {/* CTA Poster */}
          <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: '14px', padding: '18px', marginTop: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065F46', marginBottom: '6px' }}>Vous etes artisan ?</p>
            <p style={{ fontSize: '0.78rem', color: '#047857', marginBottom: '12px', lineHeight: 1.5 }}>Completez votre profil et ajoutez vos services pour etre visible dans l annuaire.</p>
            <Link href={localizePath('/publier')} style={{ display: 'block', background: '#059669', color: 'white', padding: '10px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>
              Completer mon profil
            </Link>
          </div>
        </aside>

        {/* Grille annuaire artisans */}
        <section style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
              <span style={{ fontWeight: 800, color: '#059669', fontSize: '1.1rem' }}>{filtered.length}</span> artisan{filtered.length > 1 ? 's' : ''} trouve{filtered.length > 1 ? 's' : ''}
              {categorieActive && <span style={{ marginLeft: '8px', background: '#ECFDF5', color: '#059669', padding: '2px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>📂 {categorieActive}</span>}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Profils verifies uniquement</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'services' | 'portfolio')}
                style={{ fontSize: '0.82rem', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '7px 12px', color: '#374151', background: 'white', outline: 'none', cursor: 'pointer' }}
              >
                <option value="recent">Plus recents</option>
                <option value="services">Plus de services</option>
                <option value="portfolio">Portfolio le plus fourni</option>
              </select>
            </div>
          </div>

          {!isLoading && (
            <p style={{ margin: '0 0 14px', fontSize: '0.8rem', color: '#94A3B8' }}>
              {artisans.length} sur {totalArtisans} artisans affiches
            </p>
          )}

          {/* ── Badges filtres actifs ──────────────────────────────── */}
          {(categorieActive || locationFilter || serviceFilter || sortBy !== 'recent') && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>Filtres actifs :</span>

              {categorieActive && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '20px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                  {getCategoryIcon(categorieActive)} {categorieActive}
                  <button
                    onClick={() => setCategorieActive(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontWeight: 900, lineHeight: 1, padding: 0, fontSize: '0.9rem' }}
                    aria-label="Retirer filtre categorie"
                  >×</button>
                </span>
              )}

              {locationFilter && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', borderRadius: '20px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                  📍 {locationFilter}
                  <button
                    onClick={() => { setLocationFilter(''); setSearchQuartier(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', fontWeight: 900, lineHeight: 1, padding: 0, fontSize: '0.9rem' }}
                    aria-label="Retirer filtre ville"
                  >×</button>
                </span>
              )}

              {serviceFilter && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFF7ED', border: '1px solid #FED7AA', color: '#92400E', borderRadius: '20px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                  🛠️ {serviceFilter}
                  <button
                    onClick={() => { setServiceFilter(''); setSearchService(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F97316', fontWeight: 900, lineHeight: 1, padding: 0, fontSize: '0.9rem' }}
                    aria-label="Retirer filtre service"
                  >×</button>
                </span>
              )}

              {sortBy !== 'recent' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F5F3FF', border: '1px solid #DDD6FE', color: '#5B21B6', borderRadius: '20px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}>
                  {sortBy === 'services' ? '⭐ Plus de services' : '🖼️ Portfolio fourni'}
                  <button
                    onClick={() => setSortBy('recent')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', fontWeight: 900, lineHeight: 1, padding: 0, fontSize: '0.9rem' }}
                    aria-label="Retirer filtre tri"
                  >×</button>
                </span>
              )}

              <button
                onClick={handleResetFilters}
                style={{ background: 'none', border: '1px solid #E2E8F0', color: '#64748B', borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Effacer tout
              </button>
            </div>
          )}

          {isLoading && (
            <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', padding: '20px', marginBottom: '14px' }}>
              <p style={{ margin: 0, color: '#475569', fontWeight: 600 }}>Chargement de l annuaire...</p>
            </div>
          )}

          {errorMessage && !isLoading && (
            <div style={{ background: '#FEF2F2', borderRadius: '16px', border: '1.5px solid #FECACA', padding: '20px', marginBottom: '14px' }}>
              <p style={{ margin: 0, color: '#991B1B', fontWeight: 600 }}>{errorMessage}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {filtered.map((artisan) => {
              const profileName = getProfileName(artisan);
              const whatsappHref = getWhatsAppHref(artisan.phone);
              const initials = profileName
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div key={artisan.id} style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.15s' }} className="hover:border-green-200 hover:shadow-md">

                  {/* Header carte */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {artisan.photoUrl ? (
                        <Image
                          src={artisan.photoUrl}
                          alt={profileName}
                          width={44}
                          height={44}
                          style={{ width: '44px', height: '44px', borderRadius: '999px', objectFit: 'cover', border: '1px solid #E2E8F0' }}
                        />
                      ) : (
                        <div style={{ width: '44px', height: '44px', borderRadius: '999px', border: '1px solid #A7F3D0', background: '#ECFDF5', color: '#065F46', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem' }}>
                          {initials}
                        </div>
                      )}
                      <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, lineHeight: 1.35 }}>{profileName}</h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0' }}>
                          {artisan.location || 'Localisation non renseignee'}
                        </p>
                      </div>
                    </div>
                    <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                      {getCategoryIcon(artisan.title)} {artisan.title || 'Artisan'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {artisan.profile || 'Profil en cours de completion.'}
                  </p>

                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Services
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {artisan.services.length === 0 ? (
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Aucun service ajoute</span>
                      ) : (
                        artisan.services.slice(0, 4).map((service, index) => (
                          <span key={`${artisan.id}-service-${index}`} style={{ background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {service.name}{service.price ? ` - ${service.price}` : ''}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Portfolio
                    </p>
                    {artisan.portfolio.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Pas encore de photos</span>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
                        {artisan.portfolio.map((item, index) => (
                          <Image
                            key={`${artisan.id}-portfolio-${index}`}
                            src={item.imageUrl}
                            alt={`Portfolio ${profileName} ${index + 1}`}
                            width={300}
                            height={200}
                            style={{ width: '100%', height: '78px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #E2E8F0' }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {whatsappHref ? (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: 1, background: '#25D366', color: 'white', padding: '10px', borderRadius: '10px', fontWeight: 700, textAlign: 'center', textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.532 5.854L0 24l6.336-1.51A11.955 11.955 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.817 9.817 0 0 1-5.001-1.368l-.36-.213-3.761.896.944-3.659-.234-.374A9.817 9.817 0 0 1 2.182 12C2.182 6.575 6.575 2.182 12 2.182S21.818 6.575 21.818 12 17.425 21.818 12 21.818z"/></svg>
                        Contacter sur WhatsApp
                      </a>
                    ) : (
                      <div style={{ flex: 1, background: '#F8FAFC', color: '#64748B', padding: '10px', borderRadius: '10px', fontWeight: 600, textAlign: 'center', fontSize: '0.82rem', border: '1px solid #E2E8F0' }}>
                        Numero indisponible
                      </div>
                    )}
                    <Link
                      href={localizePath(`/artisan/${artisan.id}`)}
                      style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', color: '#64748B', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      Voir profil
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {!isLoading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: '2rem', marginBottom: '12px' }}>🔍</p>
              <p style={{ fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Aucun artisan trouve</p>
              <p style={{ color: '#94A3B8', fontSize: '0.88rem' }}>Essayez d autres filtres ou revenez plus tard pour decouvrir de nouveaux profils.</p>
            </div>
          )}

          {!isLoading && filtered.length > 0 && hasMore && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={() => { void handleLoadMore(); }}
                disabled={isLoadingMore}
                style={{ background: 'white', border: '1.5px solid #E2E8F0', color: '#64748B', padding: '12px 32px', borderRadius: '10px', fontWeight: 700, fontSize: '0.88rem', cursor: isLoadingMore ? 'default' : 'pointer', opacity: isLoadingMore ? 0.7 : 1 }}
              >
                {isLoadingMore ? 'Chargement...' : 'Charger plus d artisans'}
              </button>
            </div>
          )}

        </section>

      </main>
      <Footer />
    </div>
  );
}
