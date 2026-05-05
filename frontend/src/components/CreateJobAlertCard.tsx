"use client";

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { createJobAlert, type JobAlertFrequency } from '@/lib/api';
import { getSessionStorageValue, subscribeToSessionStorage } from '@/lib/session';

type CreateJobAlertCardProps = {
  keywords: string;
  location: string;
};

export default function CreateJobAlertCard({ keywords, location }: CreateJobAlertCardProps) {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';
  const [frequency, setFrequency] = useState<JobAlertFrequency>('DAILY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const sessionUserSnapshot = useSyncExternalStore(
    subscribeToSessionStorage,
    () => getSessionStorageValue('bolo237-user'),
    () => null,
  );

  const isAuthenticated = useMemo(() => {
    try {
      if (!sessionUserSnapshot) return false;
      const parsed = JSON.parse(sessionUserSnapshot);
      return Boolean(parsed?.id);
    } catch {
      return false;
    }
  }, [sessionUserSnapshot]);

  const normalizedKeywords = String(keywords || '').trim();
  const normalizedLocation = String(location || '').trim();
  const hasCriteria = Boolean(normalizedKeywords || normalizedLocation);

  if (!hasCriteria) return null;

  const loginHref = `${localizePath('/connexion')}?redirect=${encodeURIComponent(localizePath('/recherche'))}`;

  const handleCreateAlert = async () => {
    setIsSubmitting(true);
    setMessage('');
    setIsSuccess(false);

    try {
      const fallbackKeywords = normalizedKeywords || normalizedLocation;
      await createJobAlert({
        keywords: fallbackKeywords,
        location: normalizedLocation || null,
        frequency,
      });
      setIsSuccess(true);
      setMessage(
        isEn
          ? 'Alert created. You will receive matching jobs by email.'
          : 'Alerte créée. Vous recevrez les nouvelles offres correspondantes par e-mail.'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setIsSuccess(false);
      setMessage(
        isEn
          ? `Unable to create the alert: ${errorMessage}`
          : `Impossible de créer l’alerte : ${errorMessage}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-[#D7E5F2] bg-gradient-to-r from-[#F4F9FF] via-white to-[#FFF8F2] p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#0F4C81]">
            {isEn ? 'Job alert' : 'Alerte emploi'}
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
            {isEn ? 'Create an alert for this search' : 'Créer une alerte pour cette recherche'}
          </h3>
          <p className="mt-2 text-sm font-medium text-slate-600">
            {isEn
              ? 'Save these filters and receive new matching offers without repeating your search.'
              : 'Enregistrez ces critères et recevez les nouvelles offres sans relancer votre recherche.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {normalizedKeywords ? (
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#0F4C81] shadow-sm ring-1 ring-[#D7E5F2]">
                {normalizedKeywords}
              </span>
            ) : null}
            {normalizedLocation ? (
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
                {normalizedLocation}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col gap-3 rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {isEn ? 'Frequency' : 'Fréquence'}
          </label>
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as JobAlertFrequency)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 focus:border-[#DA7756] focus:outline-none focus:ring-2 focus:ring-[#F6C5B2]"
          >
            <option value="DAILY">{isEn ? 'Every day' : 'Chaque jour'}</option>
            <option value="WEEKLY">{isEn ? 'Every week' : 'Chaque semaine'}</option>
          </select>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleCreateAlert}
              disabled={isSubmitting}
              className="rounded-2xl bg-[#0F4C81] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[#0C3E69] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? (isEn ? 'Creating...' : 'Création...')
                : (isEn ? 'Create alert' : 'Créer l’alerte')}
            </button>
          ) : (
            <Link
              href={loginHref}
              className="rounded-2xl bg-[#0F4C81] px-4 py-3 text-center text-sm font-extrabold text-white transition hover:bg-[#0C3E69]"
            >
              {isEn ? 'Sign in to activate alerts' : 'Connectez-vous pour activer les alertes'}
            </Link>
          )}

          {message ? (
            <p className={`text-xs font-bold ${isSuccess ? 'text-emerald-700' : 'text-red-600'}`}>
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}