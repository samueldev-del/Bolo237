"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  fetchJobs,
  updateJob,
  fetchVerificationSubmissions,
  reviewVerificationSubmission,
  fetchAdminTrends,
  fetchAppFeedbacks,
  type ApiJob,
  type AppFeedback,
  type AdminTrendPoint,
  type VerificationSubmission,
} from '@/lib/api';

type JobModerationState = {
  loading: boolean;
  error: string;
  items: ApiJob[];
};

type PanelMode = 'moderation' | 'trends' | 'feedbacks';

const IMAGE_KEYS = [
  { key: 'profilePhotoPreview', fr: 'Photo profil', en: 'Profile photo' },
  { key: 'idFrontPreview', fr: 'CNI/Permis - Recto', en: 'ID/License - Front' },
  { key: 'idBackPreview', fr: 'CNI/Permis - Verso', en: 'ID/License - Back' },
  { key: 'passportPreview', fr: 'Passeport', en: 'Passport' },
  { key: 'logoPreview', fr: 'Logo entreprise', en: 'Company logo' },
  { key: 'legalDocPreview', fr: 'Document legal', en: 'Legal document' },
] as const;

type JobStatusFilter = 'ALL' | 'PENDING' | 'ACTIVE' | 'REJECTED';

function statusPill(status: string) {
  const s = status.toUpperCase();
  if (s === 'APPROVED' || s === 'ACTIVE') return 'bg-green-50 text-green-700 border-green-200';
  if (s === 'REJECTED') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

export default function SuperAdminPage() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';
  const [items, setItems] = useState<VerificationSubmission[]>([]);
  const [jobs, setJobs] = useState<JobModerationState>({ loading: true, error: '', items: [] });
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>('ALL');
  const [selectedJob, setSelectedJob] = useState<ApiJob | null>(null);
  const [reviewer, setReviewer] = useState('super-admin');
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [mode, setMode] = useState<PanelMode>('moderation');
  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const [trendPoints, setTrendPoints] = useState<AdminTrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<AppFeedback[]>([]);
  const [feedbackAvg, setFeedbackAvg] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [feedbackLoading, setFeedbackLoading] = useState(true);

  const refreshVerifications = async () => {
    try {
      const rows = await fetchVerificationSubmissions();
      setItems(rows);
    } catch {
      setItems([]);
    }
  };

  const refreshJobs = async (statusFilter: JobStatusFilter = jobStatusFilter) => {
    setJobs((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const filters: { status?: string; limit: number } = { limit: 50 };
      if (statusFilter !== 'ALL') filters.status = statusFilter;
      const data = await fetchJobs(filters);
      setJobs({ loading: false, error: '', items: data.jobs });
      setSelectedJob((prev) => {
        if (prev && data.jobs.some((j) => j.id === prev.id)) return prev;
        return data.jobs[0] ?? null;
      });
    } catch (error) {
      setJobs({
        loading: false,
        error: error instanceof Error ? error.message : (isEn ? 'Unable to load jobs.' : 'Impossible de charger les annonces.'),
        items: [],
      });
    }
  };

  const refreshTrends = async (days: 7 | 30 = trendDays) => {
    setTrendLoading(true);
    try {
      const data = await fetchAdminTrends(days, isEn ? 'en' : 'fr');
      setTrendPoints(data.points);
    } catch {
      setTrendPoints([]);
    } finally {
      setTrendLoading(false);
    }
  };

  const refreshFeedbacks = async () => {
    setFeedbackLoading(true);
    try {
      const data = await fetchAppFeedbacks(100);
      setFeedbacks(data.items);
      setFeedbackAvg(data.summary.averageRating || 0);
      setFeedbackCount(data.summary.count || 0);
    } catch {
      setFeedbacks([]);
      setFeedbackAvg(0);
      setFeedbackCount(0);
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    void refreshVerifications();
    refreshJobs();
    void refreshTrends(7);
    void refreshFeedbacks();
  }, []);

  useEffect(() => {
    void refreshJobs(jobStatusFilter);
  }, [jobStatusFilter]);

  useEffect(() => {
    void refreshTrends(trendDays);
  }, [trendDays, locale]);

  const pendingCount = useMemo(() => items.filter((i) => i.status === 'pending').length, [items]);
  const pendingJobCount = useMemo(() => jobs.items.filter((j) => j.status === 'PENDING').length, [jobs.items]);
  const totalPending = pendingCount + pendingJobCount;

  const actVerification = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    try {
      await reviewVerificationSubmission({
        id,
        status,
        reviewedBy: reviewer || 'super-admin',
      });
      await refreshVerifications();
    } finally {
      setBusyId(null);
    }
  };

  const actJob = async (id: number, status: 'ACTIVE' | 'REJECTED') => {
    setBusyId(id);
    try {
      await updateJob(id, { status });
      await refreshJobs();
    } finally {
      setBusyId(null);
    }
  };

  const renderEvidenceGallery = (item: VerificationSubmission) => {
    const found = IMAGE_KEYS
      .map((meta) => ({ ...meta, value: item.payload[meta.key] }))
      .filter((entry) => typeof entry.value === 'string' && entry.value.startsWith('data:image/'));

    if (found.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm font-medium text-gray-500">
          {isEn ? 'No image proof provided (file name only or unsupported format).' : 'Aucune preuve image exploitable (nom de fichier seulement ou format non pris en charge).'}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {found.map((entry) => (
          <div key={entry.key} className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
            <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wide">
              {isEn ? entry.en : entry.fr}
            </div>
            <img src={entry.value as string} alt={entry.key} className="w-full h-44 object-cover bg-gray-100" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen text-black bg-[radial-gradient(circle_at_20%_0%,#ecfdf5_0%,#f8fafc_35%,#f1f5f9_100%)]">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold">{isEn ? 'Super Admin - Judgment Desk' : 'Super Admin - Bureau de jugement'}</h1>
            <p className="text-sm text-gray-600 font-medium mt-1">
              {isEn
                ? `Total pending actions: ${totalPending}`
                : `Total des actions en attente: ${totalPending}`}
            </p>
          </div>
          <Link href={localizePath('/')} className="text-sm font-bold text-green-700 hover:underline">
            {isEn ? 'Back to home' : 'Retour a l accueil'}
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-2 mb-6 inline-flex gap-2">
          <button
            onClick={() => setMode('moderation')}
            className={`px-4 py-2 rounded-xl text-sm font-extrabold transition ${mode === 'moderation' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {isEn ? 'Moderation' : 'Moderation'}
          </button>
          <button
            onClick={() => setMode('trends')}
            className={`px-4 py-2 rounded-xl text-sm font-extrabold transition ${mode === 'trends' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {isEn ? 'Trend chart' : 'Graphique tendance'}
          </button>
          <button
            onClick={() => setMode('feedbacks')}
            className={`px-4 py-2 rounded-xl text-sm font-extrabold transition ${mode === 'feedbacks' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {isEn ? 'App feedback wall' : 'Mur des retours'}
          </button>
        </div>

        {mode === 'moderation' && (
          <>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-green-100 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-green-700 font-extrabold">{isEn ? 'Identity queue' : 'File identite'}</p>
            <p className="text-3xl font-extrabold mt-2">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-amber-700 font-extrabold">{isEn ? 'Job ads (showing)' : 'Annonces (affichees)'}</p>
            <p className="text-3xl font-extrabold mt-2">{jobs.items.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-600 font-extrabold">{isEn ? 'Active reviewer' : 'Validateur actif'}</p>
            <p className="text-xl font-extrabold mt-2 truncate">{reviewer}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
          <label className="block text-xs uppercase tracking-wide text-gray-500 font-bold mb-2">
            {isEn ? 'Reviewer name' : 'Nom du validateur'}
          </label>
          <input
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            className="w-full sm:w-96 p-2.5 border border-gray-300 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <section className="xl:col-span-3 space-y-4">
            {items.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 font-medium">
                {isEn ? 'No verification submission yet.' : 'Aucune soumission de verification pour le moment.'}
              </div>
            )}

            {items.map((item) => (
              <article key={item.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-extrabold text-gray-900">{item.displayName}</p>
                    <p className="text-xs text-gray-500 font-medium">{item.role} • {item.phone} • {item.accountKey}</p>
                  </div>
                  <span className={`inline-flex w-fit px-3 py-1 rounded-full text-xs font-bold border ${statusPill(item.status)}`}>
                    {item.status}
                  </span>
                </div>

                {renderEvidenceGallery(item)}

                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 overflow-auto">
                  <pre>{JSON.stringify(item.payload, null, 2)}</pre>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    onClick={() => actVerification(item.id, 'approved')}
                    disabled={busyId === item.id}
                    className="flex-1 px-5 py-3 rounded-xl bg-green-600 text-white text-sm font-extrabold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {isEn ? 'APPROVE IDENTITY' : 'APPROUVER IDENTITE'}
                  </button>
                  <button
                    onClick={() => actVerification(item.id, 'rejected')}
                    disabled={busyId === item.id}
                    className="flex-1 px-5 py-3 rounded-xl bg-red-600 text-white text-sm font-extrabold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {isEn ? 'REJECT IDENTITY' : 'REJETER IDENTITE'}
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className="xl:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-100 font-extrabold text-sm">
                {isEn ? 'Job ads' : 'Annonces'}
              </div>

              <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-1.5">
                {(['ALL', 'PENDING', 'ACTIVE', 'REJECTED'] as JobStatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setJobStatusFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${jobStatusFilter === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {f === 'ALL' ? (isEn ? 'All' : 'Tous') : f}
                  </button>
                ))}
              </div>

              {jobs.loading && <p className="px-4 py-5 text-sm text-gray-500">{isEn ? 'Loading...' : 'Chargement...'}</p>}
              {jobs.error && <p className="px-4 py-5 text-sm text-red-600">{jobs.error}</p>}
              {!jobs.loading && !jobs.error && jobs.items.length === 0 && (
                <p className="px-4 py-5 text-sm text-gray-500">{isEn ? 'No jobs found.' : 'Aucune annonce trouvee.'}</p>
              )}

              <div className="max-h-96 overflow-auto divide-y divide-gray-100">
                {jobs.items.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`w-full text-left px-4 py-3 hover:bg-green-50 transition ${selectedJob?.id === job.id ? 'bg-green-50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{job.title}</p>
                      <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusPill(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{job.company} • {job.location}</p>
                    {job.author && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {isEn ? 'By' : 'Par'}: {job.author.name || job.author.email}{job.author.role ? ` (${job.author.role})` : ''}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              {!selectedJob ? (
                <p className="text-sm text-gray-500">{isEn ? 'Select an ad to review details.' : 'Selectionnez une annonce pour voir les details.'}</p>
              ) : (
                <>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border mb-3 ${statusPill(selectedJob.status)}`}>{selectedJob.status}</span>
                  <h3 className="text-lg font-extrabold text-gray-900 mb-1">{selectedJob.title}</h3>
                  <p className="text-sm font-semibold text-gray-600 mb-1">{selectedJob.company} • {selectedJob.location}</p>
                  {selectedJob.author && (
                    <p className="text-xs text-gray-500 mb-3">
                      {isEn ? 'Posted by' : 'Publie par'}: <span className="font-bold">{selectedJob.author.name || selectedJob.author.email}</span>
                      {selectedJob.author.role ? <span className="ml-1 text-gray-400">({selectedJob.author.role})</span> : ''}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed mb-4">{selectedJob.description}</p>

                  {selectedJob.status === 'PENDING' && (
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => actJob(selectedJob.id, 'ACTIVE')}
                        disabled={busyId === selectedJob.id}
                        className="w-full px-5 py-3 rounded-xl bg-green-600 text-white text-sm font-extrabold hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {isEn ? 'APPROVE AD' : 'APPROUVER L ANNONCE'}
                      </button>
                      <button
                        onClick={() => actJob(selectedJob.id, 'REJECTED')}
                        disabled={busyId === selectedJob.id}
                        className="w-full px-5 py-3 rounded-xl bg-red-600 text-white text-sm font-extrabold hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {isEn ? 'REJECT AD' : 'REJETER L ANNONCE'}
                      </button>
                    </div>
                  )}
                  {selectedJob.status !== 'PENDING' && (
                    <div className="grid grid-cols-1 gap-3">
                      {selectedJob.status === 'REJECTED' && (
                        <button
                          onClick={() => actJob(selectedJob.id, 'ACTIVE')}
                          disabled={busyId === selectedJob.id}
                          className="w-full px-5 py-3 rounded-xl bg-green-600 text-white text-sm font-extrabold hover:bg-green-700 transition disabled:opacity-50"
                        >
                          {isEn ? 'RE-APPROVE AD' : 'RE-APPROUVER L ANNONCE'}
                        </button>
                      )}
                      {(selectedJob.status === 'ACTIVE' || selectedJob.status === 'APPROVED') && (
                        <button
                          onClick={() => actJob(selectedJob.id, 'REJECTED')}
                          disabled={busyId === selectedJob.id}
                          className="w-full px-5 py-3 rounded-xl bg-red-600 text-white text-sm font-extrabold hover:bg-red-700 transition disabled:opacity-50"
                        >
                          {isEn ? 'REJECT AD' : 'REJETER L ANNONCE'}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
          </>
        )}

        {mode === 'trends' && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-xl font-extrabold text-gray-900">
                {isEn ? 'Registrations vs Publications' : 'Inscriptions vs Publications'}
              </h2>
              <div className="inline-flex gap-2">
                <button
                  onClick={() => setTrendDays(7)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${trendDays === 7 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  7 {isEn ? 'days' : 'jours'}
                </button>
                <button
                  onClick={() => setTrendDays(30)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${trendDays === 30 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  30 {isEn ? 'days' : 'jours'}
                </button>
              </div>
            </div>

            {trendLoading ? (
              <p className="text-sm text-gray-500">{isEn ? 'Loading trend data...' : 'Chargement des tendances...'}</p>
            ) : trendPoints.length === 0 ? (
              <p className="text-sm text-gray-500">{isEn ? 'No trend data available.' : 'Aucune donnee de tendance disponible.'}</p>
            ) : (
              <div className="w-full h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendPoints} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="#6b7280" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="users" name={isEn ? 'Registrations' : 'Inscriptions'} stroke="#16a34a" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="jobs" name={isEn ? 'Publications' : 'Publications'} stroke="#0ea5e9" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}

        {mode === 'feedbacks' && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-amber-700 font-extrabold">{isEn ? 'Average app rating' : 'Note moyenne app'}</p>
                <p className="text-3xl font-extrabold mt-2">{feedbackAvg.toFixed(1)}/5</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-600 font-extrabold">{isEn ? 'Total feedbacks' : 'Total retours'}</p>
                <p className="text-3xl font-extrabold mt-2">{feedbackCount}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              {feedbackLoading ? (
                <p className="text-sm text-gray-500">{isEn ? 'Loading feedbacks...' : 'Chargement des retours...'}</p>
              ) : feedbacks.length === 0 ? (
                <p className="text-sm text-gray-500">{isEn ? 'No feedback yet.' : 'Aucun retour pour le moment.'}</p>
              ) : (
                <div className="space-y-3">
                  {feedbacks.map((f) => (
                    <article key={f.id} className="rounded-xl border border-gray-200 p-4 bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <p className="font-extrabold text-gray-900">{f.authorName || `User #${f.userId || 'guest'}`}</p>
                        <p className="text-xs text-gray-500 font-bold">{new Date(f.createdAt).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}</p>
                      </div>
                      <p className="text-amber-500 text-sm mb-2">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{f.comment}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
