"use client";

import { useState } from 'react';
import Link from 'next/link';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';

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

// ── Annonces (populated from API when available) ─────────────────
type Annonce = {
  id: number;
  titre: string;
  contact: string;
  quartier: string;
  ville: string;
  categorie: string;
  urgence: string;
  budget: string;
  whatsapp: string;
  temps: string;
  description: string;
};

const annonces: Annonce[] = [];

export default function PetitsBoulots() {
  const { localizePath } = useLocale();
  const [categorieActive, setCategorieActive] = useState<string | null>(null);
  const [searchQuartier, setSearchQuartier] = useState('');

  const filtered = annonces.filter(a =>
    (!categorieActive || a.categorie === categorieActive) &&
    (!searchQuartier || a.quartier.toLowerCase().includes(searchQuartier.toLowerCase()) || a.ville.toLowerCase().includes(searchQuartier.toLowerCase()))
  );

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
              <h1 style={{ color: 'white', fontWeight: 900, fontSize: '1.6rem', margin: 0 }}>Petits Boulots</h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem', margin: '4px 0 0' }}>
                Pas de CV · Contact direct WhatsApp · Gratuit à poster
              </p>
            </div>
            <Link
              href={localizePath('/publier')}
              style={{ marginLeft: 'auto', background: 'white', color: '#059669', padding: '11px 22px', borderRadius: '10px', fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
            >
              + Poster une annonce gratuite
            </Link>
          </div>

          {/* Recherche par quartier */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <input
              type="text"
              placeholder="🔍  Rechercher un boulot..."
              style={{ flex: 2, minWidth: '180px', padding: '11px 16px', border: '1.5px solid #E2E8F0', borderRadius: '10px', outline: 'none', fontSize: '0.9rem', color: '#0F172A' }}
            />
            <input
              type="text"
              placeholder="📍  Quartier, ville..."
              value={searchQuartier}
              onChange={e => setSearchQuartier(e.target.value)}
              style={{ flex: 1, minWidth: '150px', padding: '11px 16px', border: '1.5px solid #E2E8F0', borderRadius: '10px', outline: 'none', fontSize: '0.9rem', color: '#0F172A' }}
            />
            <button style={{ background: '#059669', color: 'white', padding: '11px 24px', borderRadius: '10px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
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
            Toutes ({annonces.length})
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
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', marginBottom: '18px' }}>Filtres</h2>

            <div style={{ marginBottom: '18px', paddingBottom: '18px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Urgence</h3>
              {["Aujourd'hui", 'Cette semaine', 'Ce mois', 'Flexible'].map(u => (
                <label key={u} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '0.83rem', color: '#374151' }}>
                  <input type="checkbox" style={{ accentColor: '#059669', width: '14px', height: '14px' }} />
                  {u}
                </label>
              ))}
            </div>

            <div style={{ marginBottom: '18px', paddingBottom: '18px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Ville</h3>
              {['Douala', 'Yaoundé', 'Bafoussam', 'Buea', 'Garoua'].map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '0.83rem', color: '#374151' }}>
                  <input type="checkbox" style={{ accentColor: '#059669', width: '14px', height: '14px' }} />
                  {v}
                </label>
              ))}
            </div>

            <div>
              <h3 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Budget</h3>
              {['< 10 000 FCFA', '10 000 – 50 000', '50 000 – 100 000', '100 000+'].map(b => (
                <label key={b} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '0.83rem', color: '#374151' }}>
                  <input type="radio" name="budget" style={{ accentColor: '#059669', width: '14px', height: '14px' }} />
                  {b}
                </label>
              ))}
            </div>
          </div>

          {/* CTA Poster */}
          <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: '14px', padding: '18px', marginTop: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065F46', marginBottom: '6px' }}>Vous avez un besoin ?</p>
            <p style={{ fontSize: '0.78rem', color: '#047857', marginBottom: '12px', lineHeight: 1.5 }}>Postez votre annonce en 2 minutes. 100% gratuit.</p>
            <Link href={localizePath('/publier')} style={{ display: 'block', background: '#059669', color: 'white', padding: '10px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>
              + Poster maintenant
            </Link>
          </div>
        </aside>

        {/* Grille d'annonces eBay-style */}
        <section style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
              <span style={{ fontWeight: 800, color: '#059669', fontSize: '1.1rem' }}>{filtered.length}</span> annonce{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}
              {categorieActive && <span style={{ marginLeft: '8px', background: '#ECFDF5', color: '#059669', padding: '2px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600 }}>📂 {categorieActive}</span>}
            </p>
            <select style={{ fontSize: '0.82rem', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '7px 12px', color: '#374151', background: 'white', outline: 'none', cursor: 'pointer' }}>
              <option>Plus récentes</option>
              <option>Budget croissant</option>
              <option>Urgence</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
            {filtered.map(a => (
              <div key={a.id} style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #E2E8F0', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.15s' }} className="hover:border-green-200 hover:shadow-md">

                {/* Header carte */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ background: '#ECFDF5', color: '#065F46', fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
                    {categories.find(c => c.label === a.categorie)?.icon} {a.categorie}
                  </span>
                  <span style={{ background: a.urgence === "Aujourd'hui" || a.urgence === 'Dès maintenant' ? '#FEE2E2' : '#FEF9C3', color: a.urgence === "Aujourd'hui" || a.urgence === 'Dès maintenant' ? '#DC2626' : '#92400E', fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>
                    ⚡ {a.urgence}
                  </span>
                </div>

                {/* Titre & contact */}
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', lineHeight: 1.35 }}>{a.titre}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                    {a.contact} · 📍 {a.quartier}, {a.ville}
                  </p>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {a.description}
                </p>

                {/* Budget + temps */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ background: '#ECFDF5', color: '#059669', fontWeight: 800, fontSize: '0.88rem', padding: '4px 12px', borderRadius: '8px' }}>
                    💰 {a.budget}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{a.temps}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={`https://wa.me/${a.whatsapp.replace(/\s/g, '').replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flex: 1, background: '#25D366', color: 'white', padding: '10px', borderRadius: '10px', fontWeight: 700, textAlign: 'center', textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.532 5.854L0 24l6.336-1.51A11.955 11.955 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.817 9.817 0 0 1-5.001-1.368l-.36-.213-3.761.896.944-3.659-.234-.374A9.817 9.817 0 0 1 2.182 12C2.182 6.575 6.575 2.182 12 2.182S21.818 6.575 21.818 12 17.425 21.818 12 21.818z"/></svg>
                    Contacter sur WhatsApp
                  </a>
                  <Link
                    href={localizePath(`/annonce/${a.id}`)}
                    style={{ padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E2E8F0', color: '#64748B', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    Détails
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: '2rem', marginBottom: '12px' }}>🔍</p>
              <p style={{ fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Aucune annonce trouvée</p>
              <p style={{ color: '#94A3B8', fontSize: '0.88rem' }}>Essayez d&apos;autres filtres ou <Link href={localizePath('/publier')} style={{ color: '#059669', fontWeight: 600 }}>postez votre propre annonce</Link>.</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button style={{ background: 'white', border: '1.5px solid #E2E8F0', color: '#64748B', padding: '12px 32px', borderRadius: '10px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                Charger plus d&apos;annonces
              </button>
            </div>
          )}
        </section>

      </main>
      <Footer />
    </div>
  );
}
