"use client";

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/components/LocaleProvider';
import { createUserReview, fetchUserReviews, type UserReview } from '@/lib/api';

type ArtisanParams = {
  params: Promise<{
    id: string;
  }>;
};

export default function ArtisanVitrinePage({ params }: ArtisanParams) {
  const { id } = use(params);
  const { t, localizePath, locale } = useLocale();
  const isEn = locale === 'en';
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [maskedByReports, setMaskedByReports] = useState(false);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [reviewAvg, setReviewAvg] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [sendingReview, setSendingReview] = useState(false);

  const artisanId = Number.parseInt(id, 10);

  // Check if user is logged in for contact actions
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userRaw = window.localStorage.getItem('237jobs-user');
    setIsLoggedIn(!!userRaw);
  }, []);

  const requireAuth = (action: () => void) => {
    if (isLoggedIn) {
      action();
    } else {
      setShowLoginPrompt(true);
    }
  };

  const artisan = {
    id,
    nom: 'Jean Mvondo',
    specialite: 'Menuisier Ebeniste',
    note: 4.8,
    avisCount: 37,
    verifie: true,
    whatsapp: '+237 6XX XX XX XX',
    couvertureLabel: 'Atelier Bois Deido - Realisations recentes',
    portfolio: ['Table sur mesure', 'Dressing moderne', 'Cuisine equipee', 'Porte en bois massif', 'Bureau professionnel', 'Meuble TV'],
    services: [
      { nom: 'Fabrication de meubles sur mesure', tarif: 'A partir de 80 000 FCFA' },
      { nom: 'Installation de cuisine en bois', tarif: 'Sur devis' },
      { nom: 'Reparation et restauration', tarif: 'A partir de 25 000 FCFA' },
      { nom: 'Pose de portes et placards', tarif: 'A partir de 40 000 FCFA' },
    ],
  };

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

  const reviewStars = useMemo(() => reviewHover || reviewRating, [reviewHover, reviewRating]);

  const submitReview = async () => {
    if (!Number.isFinite(artisanId) || artisanId <= 0) {
      setReviewMessage(isEn ? 'Invalid artisan profile.' : 'Profil artisan invalide.');
      return;
    }
    if (!reviewComment.trim() || reviewComment.trim().length < 3) {
      setReviewMessage(isEn ? 'Please write a short review comment.' : 'Veuillez ecrire un court commentaire.');
      return;
    }

    let reviewerId = 0;
    try {
      const raw = localStorage.getItem('237jobs-user');
      if (raw) {
        const user = JSON.parse(raw);
        reviewerId = Number(user?.id || 0);
      }
    } catch {
      // ignore localStorage parse errors
    }

    if (!reviewerId) {
      setReviewMessage(isEn ? 'Please sign in to leave a review.' : 'Veuillez vous connecter pour laisser un avis.');
      return;
    }

    setSendingReview(true);
    setReviewMessage('');

    try {
      await createUserReview({
        reviewedId: artisanId,
        reviewerId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

      const updated = await fetchUserReviews(artisanId, 30);
      setReviews(updated.items);
      setReviewAvg(updated.summary.averageRating || 0);
      setReviewCount(updated.summary.count || 0);
      setReviewComment('');
      setReviewRating(5);
      setReviewHover(0);
      setReviewMessage(isEn ? 'Review sent successfully.' : 'Avis envoye avec succes.');
      setShowReviewForm(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setReviewMessage((isEn ? 'Review failed: ' : 'Echec avis: ') + msg);
    } finally {
      setSendingReview(false);
    }
  };

  const artisanTranslated = {
    nom: 'John Mvondo',
    specialite: 'Cabinet Maker',
    couvertureLabel: 'Deido Wood Workshop - Recent projects',
    portfolio: ['Custom table', 'Modern wardrobe', 'Fitted kitchen', 'Solid wood door', 'Office desk', 'TV stand'],
    services: [
      { nom: 'Custom furniture making', tarif: 'From 80,000 XAF' },
      { nom: 'Wood kitchen installation', tarif: 'On quotation' },
      { nom: 'Repair and restoration', tarif: 'From 25,000 XAF' },
      { nom: 'Door and closet installation', tarif: 'From 40,000 XAF' },
    ],
  };

  const display = translated
    ? artisanTranslated
    : {
        nom: artisan.nom,
        specialite: artisan.specialite,
        couvertureLabel: artisan.couvertureLabel,
        portfolio: artisan.portfolio,
        services: artisan.services,
      };

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-black pb-24 md:pb-10">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={localizePath('/')}>
            <Image src="/logo.svg" alt="237jobs" width={120} height={32} className="h-8 w-auto" />
          </Link>
          <Link href={localizePath('/recherche')} className="text-sm font-bold text-gray-600 hover:text-green-700">
            {locale === 'fr' ? 'Retour a la recherche' : 'Back to search'}
          </Link>
        </div>
      </nav>

      <header className="max-w-6xl mx-auto px-4 mt-6">
        <div className="relative rounded-3xl overflow-hidden border border-gray-200 bg-white">
          <div className="h-48 md:h-64 bg-gradient-to-r from-amber-100 via-white to-green-100 flex items-center justify-center text-gray-700 font-bold text-sm">
            {display.couvertureLabel}
          </div>

          <div className="px-6 pb-6">
            <div className="-mt-12 md:-mt-14 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-3xl shadow-sm">
                  👨🏾‍🔧
                </div>
                <div className="pb-1">
                  <h1 className="text-2xl md:text-3xl font-extrabold">{display.nom}</h1>
                  <p className="text-gray-700 font-bold">{display.specialite}</p>
                  <button
                    onClick={() => setTranslated((s) => !s)}
                    className="mt-2 inline-flex text-xs font-extrabold text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full hover:bg-green-100 transition"
                  >
                    ✨ {locale === 'fr' ? (translated ? 'Voir la version originale' : t.home.translateProfile) : (translated ? 'Show original version' : t.home.translateProfile)}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-amber-500 font-extrabold">⭐ {(reviewAvg || artisan.note).toFixed(1)}</span>
                <span className="text-sm font-bold text-gray-600">({reviewCount || artisan.avisCount} avis)</span>
                {artisan.verifie && (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-green-50 text-green-700 border border-green-100">
                    Profil Verifie
                  </span>
                )}
              </div>
            </div>

            <div className="hidden md:flex gap-3 mt-6">
              {isLoggedIn ? (
                <a
                  href={`https://wa.me/${artisan.whatsapp.replace(/\s|\+/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-white font-extrabold px-6 py-3 rounded-xl transition ${maskedByReports ? 'bg-gray-300 pointer-events-none' : 'bg-[#25D366] hover:bg-[#1fab53]'}`}
                >
                  {maskedByReports ? t.security.profileMaskedCta : t.security.contactWhatsapp}
                </a>
              ) : (
                <button
                  onClick={() => setShowLoginPrompt(true)}
                  className="bg-[#25D366] hover:bg-[#1fab53] text-white font-extrabold px-6 py-3 rounded-xl transition"
                >
                  {t.security.contactWhatsapp}
                </button>
              )}
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

        <section>
          <h2 className="text-xl md:text-2xl font-extrabold mb-4">{locale === 'fr' ? 'Portfolio' : 'Portfolio'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {display.portfolio.map((item) => (
              <div key={item} className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
                <div className="h-32 md:h-40 bg-gray-100 flex items-center justify-center text-3xl">🪵</div>
                <p className="p-3 text-sm font-bold text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl md:text-2xl font-extrabold mb-4">{locale === 'fr' ? 'Services et tarifs' : 'Services and pricing'}</h2>
          <div className="space-y-3">
            {display.services.map((service) => (
              <div key={service.nom} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 border-b border-gray-100 pb-3">
                <p className="font-bold text-gray-800">{service.nom}</p>
                <p className="text-sm font-extrabold text-green-700">{service.tarif}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-xl md:text-2xl font-extrabold">{isEn ? 'Client reviews' : 'Avis clients'}</h2>
            <div className="flex items-center gap-3">
              <p className="text-sm font-extrabold text-gray-700">
                {(reviewAvg || artisan.note).toFixed(1)}/5 ({reviewCount || artisan.avisCount})
              </p>
              <button
                onClick={() => setShowReviewForm((s) => !s)}
                className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-black text-sm font-extrabold"
              >
                {isEn ? 'Leave a review' : 'Laisser une note'}
              </button>
            </div>
          </div>

          {showReviewForm && (
            <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
              <p className="text-sm font-bold text-gray-700 mb-2">{isEn ? 'Your rating' : 'Votre note'}</p>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReviewRating(n)}
                    onMouseEnter={() => setReviewHover(n)}
                    onMouseLeave={() => setReviewHover(0)}
                    className="text-2xl leading-none"
                  >
                    <span className={n <= reviewStars ? 'text-amber-400' : 'text-gray-300'}>★</span>
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                placeholder={isEn ? 'Describe your experience with this artisan...' : 'Decrivez votre experience avec cet artisan...'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={submitReview}
                  disabled={sendingReview}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm font-bold disabled:opacity-60"
                >
                  {sendingReview ? (isEn ? 'Sending...' : 'Envoi...') : (isEn ? 'Submit review' : 'Envoyer lavis')}
                </button>
              </div>
              {reviewMessage && <p className="mt-2 text-xs font-bold text-gray-600">{reviewMessage}</p>}
            </div>
          )}

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

      {/* Login prompt modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowLoginPrompt(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
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
          {isLoggedIn ? (
            <a
              href={`https://wa.me/${artisan.whatsapp.replace(/\s|\+/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-white text-center font-extrabold py-3 rounded-xl transition ${maskedByReports ? 'bg-gray-300 pointer-events-none' : 'bg-[#25D366] hover:bg-[#1fab53]'}`}
            >
              {maskedByReports ? t.security.profileMaskedCta : 'WhatsApp'}
            </a>
          ) : (
            <button
              onClick={() => setShowLoginPrompt(true)}
              className="bg-[#25D366] hover:bg-[#1fab53] text-white text-center font-extrabold py-3 rounded-xl transition"
            >
              WhatsApp
            </button>
          )}
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
