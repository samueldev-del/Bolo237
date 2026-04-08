"use client";

import { use, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
import { fetchCandidateProfileDetail, fetchUserReviews, type UserReview } from '@/lib/api';
import { getSessionStorageValue, subscribeToSessionStorage } from '@/lib/session';
import RatingModal from '@/components/RatingModal';
import { useApi } from '@/lib/useApi';

type CandidatParams = {
  params: Promise<{
    id: string;
  }>;
};

export default function FicheCandidatPage({ params }: CandidatParams) {
  const { id } = use(params);
  const { localizePath, locale } = useLocale();
  const isEn = locale === 'en';
  // Check auth for contact access
  const userSnapshot = useSyncExternalStore(
    subscribeToSessionStorage,
    () => getSessionStorageValue('bolo237-user'),
    () => null,
  );
  const roleSnapshot = useSyncExternalStore(
    subscribeToSessionStorage,
    () => getSessionStorageValue('bolo237-account-role'),
    () => null,
  );
  const isLoggedIn = Boolean(userSnapshot);
  const userRole = roleSnapshot;

  const canViewContact = isLoggedIn && (userRole === 'entreprise' || userRole === 'artisan');

  const candidatId = Number.parseInt(id, 10);
  const { data: candidate, loading } = useApi(
    () => (Number.isFinite(candidatId) && candidatId > 0 ? fetchCandidateProfileDetail(candidatId) : Promise.reject(new Error('Invalid candidate id'))),
    null,
    [candidatId]
  );
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [reviewAvg, setReviewAvg] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    const loadReviews = async () => {
      if (!Number.isFinite(candidatId) || candidatId <= 0) return;
      try {
        const res = await fetchUserReviews(candidatId, 30);
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
  }, [candidatId]);

  const reloadReviews = async () => {
    try {
      const updated = await fetchUserReviews(candidatId, 30);
      setReviews(updated.items);
      setReviewAvg(updated.summary.averageRating || 0);
      setReviewCount(updated.summary.count || 0);
    } catch {
      // ignore
    }
  };

  const profileBlocks = candidate?.profile;
  const profil = candidate
    ? {
        id: candidate.id,
        nom: candidate.nom,
        titre: candidate.titre,
        localisation: candidate.localisation,
        experienceTotale: candidate.experience,
        disponibilite: candidate.disponibilite,
        bio: profileBlocks?.profile || (isEn ? 'Candidate profile coming soon.' : 'Resume candidat bientot disponible.'),
        telephone: profileBlocks?.phone || candidate.user?.phone || (isEn ? 'Not shared yet' : 'Non partage pour le moment'),
        email: profileBlocks?.email || candidate.user?.email || '-',
        competences: candidate.competences || [],
        langues: (profileBlocks?.languagesText || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        experiences: (profileBlocks?.experience || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, index) => ({
            poste: line,
            entreprise: '',
            date: '',
            description: line,
            key: `exp-${index}`,
          })),
        formations: (profileBlocks?.education || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, index) => ({ diplome: line, ecole: '', date: '', key: `edu-${index}` })),
        isVerified: Boolean(candidate.user?.isVerified),
      }
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!profil) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] flex items-center justify-center px-4">
        <div className="max-w-md text-center bg-white rounded-3xl border border-gray-200 p-8">
          <h1 className="text-2xl font-extrabold text-black mb-3">{isEn ? 'Candidate not found' : 'Candidat introuvable'}</h1>
          <p className="text-sm text-gray-500 mb-5">{isEn ? 'This candidate profile is unavailable.' : 'Ce profil candidat est indisponible.'}</p>
          <Link href={localizePath('/cvtheque')} className="inline-flex items-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-green-700 transition">
            <span aria-hidden="true">←</span>
            {isEn ? 'Back to CV database' : 'Retour a la CVtheque'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-black pb-10">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={localizePath('/cvtheque')} className="text-sm font-bold text-gray-600 hover:text-green-700">
            ← {isEn ? 'Back to CV database' : 'Retour a la CVtheque'}
          </Link>
          <p className="text-xs text-gray-400 font-bold">ID #{profil.id}</p>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2 space-y-6">
          <article className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold">{profil.nom}</h1>
                <p className="text-lg font-bold text-gray-700 mt-1">{profil.titre}</p>
                <p className="text-sm text-gray-500 mt-1">{profil.localisation} • Experience: {profil.experienceTotale}</p>
                <span className="inline-flex mt-3 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-xs font-extrabold uppercase">
                  {profil.disponibilite}
                </span>
                {profil.isVerified && (
                  <span className="inline-flex mt-3 ml-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-extrabold uppercase">
                    ✓ {isEn ? 'Certified' : 'Certifie'}
                  </span>
                )}
              </div>

              {canViewContact ? (
                <button className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-3 rounded-xl transition">
                  {isEn ? 'Contact candidate' : 'Contacter le candidat'}
                </button>
              ) : (
                <Link href={localizePath('/connexion')} className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-3 rounded-xl transition inline-block">
                  {isEn ? 'Sign in to contact' : 'Connectez-vous pour contacter'}
                </Link>
              )}
            </div>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl font-extrabold mb-3">Resume du candidat</h2>
            <p className="text-gray-700 leading-relaxed">{profil.bio}</p>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl font-extrabold mb-4">Parcours professionnel</h2>
            <div className="space-y-5">
              {profil.experiences.length === 0 ? (
                <p className="text-sm text-gray-500">{isEn ? 'No experience details shared yet.' : 'Aucune experience detaillee partagee pour le moment.'}</p>
              ) : profil.experiences.map((exp) => (
                <div key={exp.key} className="relative pl-6 border-l-2 border-gray-200">
                  <div className="absolute w-3 h-3 bg-green-600 rounded-full -left-[7px] top-1"></div>
                  <h3 className="font-extrabold text-black">{exp.poste}</h3>
                  {exp.entreprise ? <p className="text-sm font-bold text-gray-700">{exp.entreprise}</p> : null}
                  {exp.date ? <p className="text-xs text-gray-500 mb-2">{exp.date}</p> : null}
                  <p className="text-sm text-gray-700">{exp.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl font-extrabold mb-4">Formation</h2>
            <div className="space-y-4">
              {profil.formations.length === 0 ? (
                <p className="text-sm text-gray-500">{isEn ? 'No education details shared yet.' : 'Aucune formation detaillee partagee pour le moment.'}</p>
              ) : profil.formations.map((form) => (
                <div key={form.key} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <p className="font-extrabold">{form.diplome}</p>
                  {form.ecole ? <p className="text-sm text-gray-700">{form.ecole}</p> : null}
                  {form.date ? <p className="text-xs text-gray-500">{form.date}</p> : null}
                </div>
              ))}
            </div>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl font-extrabold mb-4">Langues</h2>
            <div className="flex flex-wrap gap-2">
              {(profil.langues.length > 0 ? profil.langues : [isEn ? 'Not specified yet' : 'Non precise pour le moment']).map((langue) => (
                <span key={langue} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold">
                  {langue}
                </span>
              ))}
            </div>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-xl font-extrabold">
                {isEn ? 'Reviews' : 'Avis'}
                {reviewCount > 0 && (
                  <span className="ml-2 text-sm font-bold text-gray-500">
                    {reviewAvg.toFixed(1)}/5 ({reviewCount})
                  </span>
                )}
              </h2>
              {isLoggedIn && (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-black text-sm font-extrabold"
                >
                  {isEn ? 'Leave a review' : 'Laisser un avis'}
                </button>
              )}
            </div>

            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-500 font-medium">
                  {isEn ? 'No reviews yet. Be the first to rate this candidate.' : 'Aucun avis pour le moment. Soyez le premier a noter ce candidat.'}
                </p>
              ) : (
                reviews.map((avis) => (
                  <div key={avis.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-extrabold">{avis.reviewer?.name || avis.reviewer?.email || `User #${avis.reviewerId}`}</p>
                      <p className="text-xs text-gray-500 font-bold">{new Date(avis.createdAt).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}</p>
                    </div>
                    <p className="text-amber-500 text-sm mb-2">{'★'.repeat(avis.rating)}{'☆'.repeat(5 - avis.rating)}</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{avis.comment}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <aside className="space-y-4 h-fit md:sticky md:top-6">
          {canViewContact ? (
            <article className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="text-base font-extrabold mb-3">{isEn ? 'Candidate contact' : 'Coordonnees du candidat'}</h3>
              <p className="text-sm text-gray-700 mb-1"><span className="font-bold">Email:</span> {profil.email}</p>
              <p className="text-sm text-gray-700 mb-3"><span className="font-bold">{isEn ? 'Phone' : 'Telephone'}:</span> {profil.telephone}</p>
              <p className="text-xs font-bold text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                {isEn ? 'Free access to contact details for all companies.' : 'Acces gratuit aux coordonnees pour toutes les entreprises.'}
              </p>
            </article>
          ) : (
            <article className="bg-white border border-gray-200 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">🔒</div>
              <h3 className="text-base font-extrabold mb-2">{isEn ? 'Contact details' : 'Coordonnees'}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {isEn
                  ? 'Create a company or artisan account to access this candidate\'s contact details.'
                  : 'Creez un compte entreprise ou artisan pour acceder aux coordonnees de ce candidat.'}
              </p>
              <Link href={localizePath('/connexion')} className="block w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition text-sm">
                {isEn ? 'Create an account' : 'Creer un compte'}
              </Link>
            </article>
          )}

          {canViewContact ? (
            <article className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="text-base font-extrabold mb-3">{isEn ? 'Quick actions' : 'Actions rapides'}</h3>
              <button className="w-full bg-black text-white font-extrabold py-3 rounded-xl hover:bg-gray-800 transition mb-2">
                {isEn ? 'Send an offer' : 'Proposer une offre'}
              </button>
              <button className="w-full bg-white text-black border border-gray-300 font-extrabold py-3 rounded-xl hover:border-gray-400 transition">
                {isEn ? 'Download CV (PDF)' : 'Telecharger le CV (PDF)'}
              </button>
            </article>
          ) : (
            <article className="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 className="text-base font-extrabold mb-3">{isEn ? 'Quick actions' : 'Actions rapides'}</h3>
              <Link href={localizePath('/connexion')} className="block w-full bg-black text-white font-extrabold py-3 rounded-xl hover:bg-gray-800 transition mb-2 text-center">
                {isEn ? 'Sign in to contact' : 'Se connecter pour contacter'}
              </Link>
            </article>
          )}

          <article className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-base font-extrabold mb-3">Competences cles</h3>
            <div className="flex flex-wrap gap-2">
              {profil.competences.map((comp) => (
                <span key={comp} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">
                  {comp}
                </span>
              ))}
            </div>
          </article>
        </aside>
      </main>

      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        reviewedId={candidatId}
        reviewedName={profil.nom}
        isEn={isEn}
        onSuccess={reloadReviews}
      />
    </div>
  );
}
