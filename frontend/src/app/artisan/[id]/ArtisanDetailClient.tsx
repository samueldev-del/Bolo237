"use client";

import { use, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/components/LocaleProvider';
import FraudReportButton from '@/components/FraudReportButton';
import {
  fetchPublicArtisanProfile,
  fetchUserReviews,
  trackArtisanContactClick,
  type ApiArtisanPublicDetail,
  type UserReview,
} from '@/lib/api';
import { getSessionStorageValue, subscribeToSessionStorage } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import RatingModal from '@/components/RatingModal';

type ArtisanParams = {
  params: Promise<{
    id: string;
  }>;
};

export default function ArtisanDetailClient({ params }: ArtisanParams) {
  const { id } = use(params);
  const { t, localizePath, locale } = useLocale();
  const isEn = locale === 'en';
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [maskedByReports, setMaskedByReports] = useState(false);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [reviewAvg, setReviewAvg] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const artisanId = Number.parseInt(id, 10);

  // Check if user is logged in for contact actions
  const userSnapshot = useSyncExternalStore(
    subscribeToSessionStorage,
    () => getSessionStorageValue('bolo237-user'),
    () => null,
  );
  const isLoggedIn = Boolean(userSnapshot);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publicDetail, setPublicDetail] = useState<ApiArtisanPublicDetail | null>(null);
  const [artisan, setArtisan] = useState<{
    id: string;
    nom: string;
    specialite: string;
    verifie: boolean;
    whatsapp: string;
    location: string;
    profile: string;
  } | null>(null);

  const whatsappNumber = artisan?.whatsapp.replace(/\s|\+/g, '') || '';
  const whatsappHref = `https://wa.me/${whatsappNumber}`;

  const handleWhatsAppClick = () => {
    if (!Number.isFinite(artisanId) || artisanId <= 0) {
      return;
    }

    trackEvent('whatsapp_contact', { artisanId });
    trackArtisanContactClick(artisanId).catch(() => {
      // Silent failure: never block the user contact flow.
    });
  };

  const requireAuth = (action: () => void) => {
    if (isLoggedIn) {
      action();
    } else {
      setShowLoginPrompt(true);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!Number.isFinite(artisanId) || artisanId <= 0) {
        setLoading(false);
        return;
      }
      try {
        const profile = await fetchPublicArtisanProfile(artisanId);
        setPublicDetail(profile);
        setArtisan({
          id,
          nom: profile.fullName || profile.name || (locale === 'fr' ? 'Artisan' : 'Artisan'),
          specialite: profile.title || '',
          verifie: true,
          whatsapp: profile.phone || '',
          location: profile.location || '',
          profile: profile.profile || '',
        });
      } catch {
        setPublicDetail(null);
        setArtisan(null);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [artisanId, id, locale]);

  useEffect(() => {
    const loadReviews = async () => {
      if (!Number.isFinite(artisanId) || artisanId <= 0) return;
      try {
        const res = await fetchUserReviews(artisanId, 30);
        setReviews(res.items);
        setReviewAvg(res.summary.averageRating || 0);
        setReviewCount(res.summary.count || 0);
      } catch {
        setReviews([]);
        setReviewAvg(0);
        setReviewCount(0);
      }
    };

    loadReviews();
  }, [artisanId]);

  const reloadReviews = async () => {
    try {
      const updated = await fetchUserReviews(artisanId, 30);
      setReviews(updated.items);
      setReviewAvg(updated.summary.averageRating || 0);
      setReviewCount(updated.summary.count || 0);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{locale === 'fr' ? 'Chargement...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="min-h-screen bg-[#f5f7f8]">
        <nav className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-5xl mx-auto">
            <Link href={localizePath('/')} className="font-bold text-lg text-green-700">Bolo237</Link>
          </div>
        </nav>
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <p className="text-5xl mb-4">{'\uD83D\uDD27'}</p>
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              {locale === 'fr' ? 'Profil introuvable' : 'Profile not found'}
            </h1>
            <p className="text-gray-500 mb-6">
              {locale === 'fr'
                ? 'Ce profil artisan n\u2019existe pas ou a \u00e9t\u00e9 retir\u00e9.'
                : 'This artisan profile does not exist or has been removed.'}
            </p>
            <Link href={localizePath('/petits-boulots')} className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition">
              {locale === 'fr' ? 'Voir les services' : 'Browse services'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-black pb-24 md:pb-10">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={localizePath('/')}>
            <Image src="/logo.svg" alt="Bolo237" width={120} height={32} priority className="h-8 w-auto" />
          </Link>
          <Link href={localizePath('/recherche')} className="text-sm font-bold text-gray-600 hover:text-green-700">
            {locale === 'fr' ? 'Retour à la recherche' : 'Back to search'}
          </Link>
        </div>
      </nav>

      <header className="max-w-6xl mx-auto px-4 mt-6">
        <div className="relative rounded-3xl overflow-hidden border border-gray-200 bg-white">
          <div className="h-48 md:h-64 bg-gradient-to-r from-amber-100 via-white to-green-100 flex items-center justify-center text-gray-700 font-bold text-sm">
            {artisan.location || (locale === 'fr' ? 'Artisan sur Bolo237' : 'Artisan on Bolo237')}
          </div>

          <div className="px-6 pb-6">
            <div className="-mt-12 md:-mt-14 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-3xl shadow-sm">
                  👨🏾‍🔧
                </div>
                <div className="pb-1">
                  <h1 className="text-2xl md:text-3xl font-extrabold">{artisan.nom}</h1>
                  <p className="text-gray-700 font-bold">{artisan.specialite}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {reviewCount > 0 && (
                  <>
                    <span className="text-amber-500 font-extrabold">⭐ {reviewAvg.toFixed(1)}</span>
                    <span className="text-sm font-bold text-gray-600">({reviewCount} {locale === 'fr' ? 'avis' : 'reviews'})</span>
                  </>
                )}
                {artisan.verifie && (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-green-50 text-green-700 border border-green-100">
                    {locale === 'fr' ? 'Profil Verifie' : 'Verified Profile'}
                  </span>
                )}
              </div>
            </div>

            <div className="hidden md:flex gap-3 mt-6">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className={`text-white font-extrabold px-6 py-3 rounded-xl transition ${maskedByReports ? 'bg-gray-300 pointer-events-none' : 'bg-[#25D366] hover:bg-[#1fab53]'}`}
              >
                {maskedByReports ? t.security.profileMaskedCta : t.security.contactWhatsapp}
              </a>
              <button
                onClick={() => requireAuth(() => setShowQuoteForm((s) => !s))}
                disabled={maskedByReports}
                className="border border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed hover:border-gray-400 bg-white text-black font-extrabold px-6 py-3 rounded-xl transition"
              >
                {t.security.requestQuote}
              </button>
            </div>

            {showQuoteForm && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <h2 className="font-extrabold mb-3">Demande de devis rapide</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Votre nom" />
                  <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Votre numero" />
                  <textarea className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Decrivez votre besoin" />
                </div>
                <button className="mt-3 bg-black text-white font-bold px-5 py-2 rounded-lg">Envoyer</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {maskedByReports && (
          <section className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="text-red-700 font-extrabold text-sm">
              {t.security.autoMaskedArtisan}
            </p>
          </section>
        )}

        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-amber-800 font-extrabold text-sm">
            {t.security.artisanWarning}
          </p>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-lg md:text-xl font-extrabold mb-3">{t.security.antiFraudTitle}</h2>
          <FraudReportButton
            targetType="artisan"
            targetId={id}
            onAutoMaskedChange={setMaskedByReports}
          />
        </section>

        {artisan.profile && (
          <section className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl md:text-2xl font-extrabold mb-4">{locale === 'fr' ? 'À propos' : 'About'}</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{artisan.profile}</p>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl md:text-2xl font-extrabold mb-4">{locale === 'fr' ? 'Services proposes' : 'Offered services'}</h2>
          {publicDetail?.services?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {publicDetail.services.map((service) => (
                <article key={service.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="font-extrabold text-gray-900">{service.name}</p>
                  {service.description ? (
                    <p className="mt-1 text-sm text-gray-600 leading-relaxed">{service.description}</p>
                  ) : null}
                  {service.price ? (
                    <p className="mt-2 inline-flex rounded-lg bg-green-50 border border-green-100 text-green-700 px-2 py-1 text-xs font-extrabold">
                      {service.price}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 font-medium">
              {locale === 'fr' ? 'Aucun service detaille pour le moment.' : 'No detailed services yet.'}
            </p>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl md:text-2xl font-extrabold mb-4">Portfolio</h2>
          {publicDetail?.portfolio?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {publicDetail.portfolio.map((item) => (
                <figure key={item.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <Image
                    src={item.imageUrl}
                    alt={item.title || `${artisan.nom} portfolio`}
                    width={420}
                    height={320}
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="h-32 w-full object-cover"
                  />
                  {item.title ? (
                    <figcaption className="px-3 py-2 text-xs font-bold text-gray-600">{item.title}</figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 font-medium">
              {locale === 'fr' ? 'Pas encore de photos partagees.' : 'No photos shared yet.'}
            </p>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl md:text-2xl font-extrabold">{isEn ? 'Client reviews' : 'Avis clients'}</h2>
            <div className="flex items-center gap-3">
              {reviewCount > 0 && (
                <p className="text-sm font-extrabold text-gray-700">
                  {reviewAvg.toFixed(1)}/5 ({reviewCount})
                </p>
              )}
              <button
                onClick={() => requireAuth(() => setShowRatingModal(true))}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-black text-sm font-extrabold"
              >
                {isEn ? 'Leave a review' : 'Laisser une note'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500 font-medium">
                {isEn ? 'No reviews yet. Be the first to rate this artisan.' : 'Aucun avis pour le moment. Soyez le premier a noter cet artisan.'}
              </p>
            ) : (
              reviews.map((avis) => (
                <article key={avis.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-extrabold">{avis.reviewer?.name || avis.reviewer?.email || `Client #${avis.reviewerId}`}</p>
                    <p className="text-xs text-gray-500 font-bold">{new Date(avis.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US')}</p>
                  </div>
                  <p className="text-amber-500 text-sm mb-2">{'★'.repeat(avis.rating)}{'☆'.repeat(5 - avis.rating)}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{avis.comment}</p>
                </article>
              ))
            )}
          </div>
        </section>

      </main>

      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        reviewedId={artisanId}
        reviewedName={artisan.nom}
        isEn={isEn}
        onSuccess={reloadReviews}
      />

      {/* Login prompt modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLoginPrompt(false)}
            aria-label={isEn ? 'Close login prompt' : 'Fermer la fenetre de connexion'}
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔒</div>
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">
              {isEn ? 'Create an account to contact' : 'Créez un compte pour contacter'}
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              {isEn
                ? 'Sign up for free to contact this artisan via WhatsApp and request quotes.'
                : 'Inscrivez-vous gratuitement pour contacter cet artisan via WhatsApp et demander des devis.'}
            </p>
            <div className="flex flex-col gap-2">
              <Link href={localizePath('/connexion')} className="bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition text-sm">
                {isEn ? 'Create an account' : 'Créer un compte'}
              </Link>
              <Link href={localizePath('/connexion')} className="border border-gray-300 text-gray-700 font-bold py-3 rounded-xl hover:border-gray-400 transition text-sm">
                {isEn ? 'Sign in' : 'Se connecter'}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="fixed md:hidden bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-50">
        <div className="grid grid-cols-2 gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            className={`text-white text-center font-extrabold py-3 rounded-xl transition ${maskedByReports ? 'bg-gray-300 pointer-events-none' : 'bg-[#25D366] hover:bg-[#1fab53]'}`}
          >
            {maskedByReports ? t.security.profileMaskedCta : 'WhatsApp'}
          </a>
          <button
            onClick={() => requireAuth(() => setShowQuoteForm((s) => !s))}
            disabled={maskedByReports}
            className="bg-black disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 text-white font-extrabold py-3 rounded-xl transition"
          >
            {t.security.requestQuote}
          </button>
        </div>
      </div>
    </div>
  );
}
