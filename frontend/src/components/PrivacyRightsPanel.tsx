"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, exportPrivacyData, fetchSessionUser, requestAccountDeletion } from '@/lib/api';
import { useLocale } from '@/components/LocaleProvider';
import { getStoredUser, mergeStoredUser } from '@/lib/session';

type SessionState = 'loading' | 'authenticated' | 'guest';

type SessionUser = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isVerified: boolean;
};

function formatRole(role: string, isEn: boolean): string {
  switch (role) {
    case 'entreprise':
      return isEn ? 'Company account' : 'Compte entreprise';
    case 'artisan':
      return isEn ? 'Artisan account' : 'Compte artisan';
    default:
      return isEn ? 'Candidate account' : 'Compte candidat';
  }
}

function triggerJsonDownload(data: Record<string, unknown>): void {
  const payload = JSON.stringify(data, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `bolo237-privacy-export-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function PrivacyRightsPanel() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  const [sessionState, setSessionState] = useState<SessionState>('loading');
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteReference, setDeleteReference] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser?.id && storedUser.email && storedUser.role) {
      setSessionUser({
        id: storedUser.id,
        email: String(storedUser.email),
        name: typeof storedUser.name === 'string' ? storedUser.name : null,
        role: String(storedUser.role),
        isVerified: Boolean(storedUser.isVerified),
      });
    }

    let cancelled = false;

    const syncSession = async () => {
      try {
        const liveUser = await fetchSessionUser();
        if (cancelled) return;
        const nextUser: SessionUser = {
          id: liveUser.id,
          email: liveUser.email,
          name: liveUser.name,
          role: liveUser.role,
          isVerified: liveUser.isVerified,
        };
        mergeStoredUser({
          id: nextUser.id,
          email: nextUser.email,
          name: nextUser.name || undefined,
          role: nextUser.role,
          isVerified: nextUser.isVerified,
        });
        setSessionUser(nextUser);
        setSessionState('authenticated');
      } catch {
        if (cancelled) return;
        setSessionUser(null);
        setSessionState('guest');
      }
    };

    syncSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const requireLoginMessage = isEn
    ? 'Please sign in with the account concerned to use these privacy actions.'
    : 'Connectez-vous avec le compte concerne pour utiliser ces actions de confidentialite.';

  const handleExport = async () => {
    setIsExporting(true);
    setExportFeedback(null);
    setExportError(null);

    try {
      const data = await exportPrivacyData();
      triggerJsonDownload(data);
      setExportFeedback(
        isEn
          ? 'Your export has been prepared and downloaded as a JSON file.'
          : 'Votre export a ete prepare et telecharge au format JSON.'
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSessionState('guest');
        setSessionUser(null);
        setExportError(requireLoginMessage);
      } else {
        setExportError(
          toMessage(
            error,
            isEn ? 'Unable to prepare your export right now.' : 'Impossible de preparer votre export pour le moment.'
          )
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeleteError(null);

    if (!deleteConfirmed) {
      setDeleteError(
        isEn
          ? 'Please confirm that you understand deletion requests remain subject to identity and legal retention checks.'
          : 'Veuillez confirmer que vous comprenez que la suppression reste soumise a un controle d identite et aux obligations legales de conservation.'
      );
      return;
    }

    setIsSubmittingDelete(true);

    try {
      const response = await requestAccountDeletion(deleteReason.trim() || undefined);
      setDeleteReference(response.reference);
      setDeleteReason('');
      setDeleteConfirmed(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setSessionState('guest');
        setSessionUser(null);
        setDeleteError(requireLoginMessage);
      } else {
        setDeleteError(
          toMessage(
            error,
            isEn ? 'Unable to register your deletion request right now.' : 'Impossible d enregistrer votre demande de suppression pour le moment.'
          )
        );
      }
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-[#E8C4B0] bg-gradient-to-br from-[#FFF7F1] via-white to-[#FFF1E6] p-6 md:p-8 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#C4623F]">
            {isEn ? 'Privacy Request Center' : 'Centre de demandes confidentialite'}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-gray-900">
            {isEn ? 'Use your privacy rights without waiting for manual support' : 'Exercez vos droits sans attendre un traitement manuel'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {isEn
              ? 'When you are signed in, you can export the data associated with your account and submit a deletion request that our team will review under identity and retention rules.'
              : 'Lorsque vous etes connecte, vous pouvez exporter les donnees liees a votre compte et soumettre une demande de suppression qui sera revue selon les regles d identite et de conservation.'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm md:min-w-[260px]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
            {isEn ? 'Session status' : 'Statut de session'}
          </p>
          {sessionState === 'loading' ? (
            <p className="mt-2 text-sm font-medium text-gray-600">
              {isEn ? 'Checking your secure session...' : 'Verification de votre session securisee...'}
            </p>
          ) : sessionUser ? (
            <div className="mt-2 space-y-1">
              <p className="text-sm font-bold text-gray-900">{sessionUser.name || sessionUser.email}</p>
              <p className="text-sm text-gray-600">{sessionUser.email}</p>
              <p className="text-xs font-semibold text-[#C4623F]">
                {formatRole(sessionUser.role, isEn)}{sessionUser.isVerified ? (isEn ? ' • verified' : ' • verifie') : ''}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm font-medium text-amber-700">
              {isEn ? 'Not signed in' : 'Non connecte'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
            {isEn ? 'Data export' : 'Export des donnees'}
          </p>
          <h3 className="mt-2 text-xl font-extrabold text-gray-900">
            {isEn ? 'Download my account data' : 'Telecharger mes donnees'}
          </h3>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {isEn
              ? 'The export includes the information currently associated with your account, profile, notifications, saved items, reviews, and verification submissions found in our systems.'
              : 'L export comprend les informations actuellement rattachees a votre compte, profil, notifications, elements sauvegardes, avis et soumissions de verification presentes dans nos systemes.'}
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={sessionState !== 'authenticated' || isExporting}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-[#C4623F] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#A94F2F] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isExporting
              ? (isEn ? 'Preparing export...' : 'Preparation de l export...')
              : (isEn ? 'Export my data as JSON' : 'Exporter mes donnees en JSON')}
          </button>
          {exportFeedback && (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {exportFeedback}
            </p>
          )}
          {exportError && (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {exportError}
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
            {isEn ? 'Deletion workflow' : 'Parcours de suppression'}
          </p>
          <h3 className="mt-2 text-xl font-extrabold text-gray-900">
            {isEn ? 'Request account deletion' : 'Demander la suppression du compte'}
          </h3>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {isEn
              ? 'Deletion is not instant. We register your request, verify identity, then isolate data that must be retained for legal, anti-fraud, or accounting reasons before final deletion.'
              : 'La suppression n est pas instantanee. Nous enregistrons votre demande, verifions l identite, puis isolons les donnees qui doivent etre conservees pour des raisons legales, antifraude ou comptables avant suppression finale.'}
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleDeleteRequest}>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-gray-800">
                {isEn ? 'Reason for deletion (optional)' : 'Motif de suppression (optionnel)'}
              </span>
              <textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                rows={4}
                maxLength={800}
                placeholder={isEn ? 'Example: I no longer want to use the service.' : 'Exemple : je ne souhaite plus utiliser le service.'}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 shadow-sm outline-none transition focus:border-[#C4623F] focus:ring-2 focus:ring-[#F5D7C6]"
              />
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-[#F2D7C8] bg-[#FFF8F3] px-4 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(event) => setDeleteConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#C4623F] focus:ring-[#C4623F]"
              />
              <span>
                {isEn
                  ? 'I understand that account deletion requests are processed after identity verification and may be partially delayed by legal retention duties.'
                  : 'Je comprends que les demandes de suppression sont traitees apres verification d identite et peuvent etre partiellement differees par des obligations legales de conservation.'}
              </span>
            </label>

            <button
              type="submit"
              disabled={sessionState !== 'authenticated' || isSubmittingDelete}
              className="inline-flex items-center justify-center rounded-full border border-[#C4623F] px-5 py-3 text-sm font-bold text-[#C4623F] transition hover:bg-[#FFF1E8] disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
            >
              {isSubmittingDelete
                ? (isEn ? 'Submitting request...' : 'Envoi de la demande...')
                : (isEn ? 'Submit deletion request' : 'Soumettre la demande de suppression')}
            </button>
          </form>

          {deleteReference && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-bold">
                {isEn ? 'Deletion request registered.' : 'Demande de suppression enregistree.'}
              </p>
              <p className="mt-1">
                {isEn ? 'Reference:' : 'Reference :'} <span className="font-mono text-xs">{deleteReference}</span>
              </p>
            </div>
          )}

          {deleteError && (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {deleteError}
            </p>
          )}
        </div>
      </div>

      {sessionState === 'guest' && (
        <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white/80 px-5 py-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">
            {isEn ? 'Sign in to use self-service privacy actions.' : 'Connectez-vous pour utiliser les actions de confidentialite en libre-service.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href={localizePath('/connexion')}
              className="inline-flex items-center justify-center rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-black"
            >
              {isEn ? 'Sign in' : 'Se connecter'}
            </Link>
            <a
              href="mailto:contact@bolo237.com"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
            >
              {isEn ? 'Contact support' : 'Contacter le support'}
            </a>
          </div>
        </div>
      )}
    </section>
  );
}