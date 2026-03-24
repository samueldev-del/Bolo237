"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  fetchJobs, updateJob, fetchVerificationSubmissions, reviewVerificationSubmission,
  fetchAdminTrends, fetchAppFeedbacks,
  type ApiJob, type AppFeedback, type AdminTrendPoint, type VerificationSubmission,
} from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type JobStatusFilter = 'ALL' | 'PENDING' | 'ACTIVE' | 'REJECTED';
type PanelMode = 'dashboard' | 'moderation' | 'users' | 'reviews' | 'trends' | 'feedbacks';
type AdminUser = { id: number; name: string; email: string; role: string; phone?: string; isVerified: boolean; isBanned: boolean; createdAt: string };
type AdminReview = { id: number; rating: number; comment: string; createdAt: string; reviewed: { id: number; name: string; email: string; role: string } | null; reviewer: { id: number; name: string; email: string; role: string } | null };
type ReviewAlert = { userId: number; name: string; role: string; averageRating: number; reviewCount: number };

const IMAGE_KEYS = [
  { key: 'profilePhotoPreview', fr: 'Photo profil', en: 'Profile photo' },
  { key: 'idFrontPreview', fr: 'CNI/Permis - Recto', en: 'ID - Front' },
  { key: 'idBackPreview', fr: 'CNI/Permis - Verso', en: 'ID - Back' },
  { key: 'passportPreview', fr: 'Passeport', en: 'Passport' },
  { key: 'logoPreview', fr: 'Logo entreprise', en: 'Company logo' },
  { key: 'legalDocPreview', fr: 'Document legal', en: 'Legal document' },
] as const;

function statusPill(status: string) {
  const s = status.toUpperCase();
  if (s === 'APPROVED' || s === 'ACTIVE') return 'bg-green-50 text-green-700 border-green-200';
  if (s === 'REJECTED') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

export default function SuperAdminPage() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  const [mode, setMode] = useState<PanelMode>('dashboard');
  const [items, setItems] = useState<VerificationSubmission[]>([]);
  const [jobs, setJobs] = useState<{ loading: boolean; error: string; items: ApiJob[] }>({ loading: true, error: '', items: [] });
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatusFilter>('ALL');
  const [selectedJob, setSelectedJob] = useState<ApiJob | null>(null);
  const [reviewer, setReviewer] = useState('super-admin');
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const [trendPoints, setTrendPoints] = useState<AdminTrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<AppFeedback[]>([]);
  const [feedbackAvg, setFeedbackAvg] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [feedbackLoading, setFeedbackLoading] = useState(true);

  // New: Stats, Users, Reviews
  const [stats, setStats] = useState({ users: 0, pendingJobs: 0, approvedJobs: 0, reports: 0, todaySignups: 0, totalReviews: 0, enterprisePending: 0 });
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [adminReviews, setAdminReviews] = useState<AdminReview[]>([]);
  const [reviewAlerts, setReviewAlerts] = useState<ReviewAlert[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Data loaders
  const refreshStats = async () => {
    try { const r = await fetch(`${API}/api/admin/stats`); const d = await r.json(); setStats(d); } catch { /* */ }
  };
  const refreshVerifications = async () => { try { setItems(await fetchVerificationSubmissions()); } catch { setItems([]); } };
  const refreshJobs = async (sf: JobStatusFilter = jobStatusFilter) => {
    setJobs(p => ({ ...p, loading: true, error: '' }));
    try {
      const f: { status?: string; limit: number } = { limit: 50 };
      if (sf !== 'ALL') f.status = sf;
      const d = await fetchJobs(f);
      setJobs({ loading: false, error: '', items: d.jobs });
      setSelectedJob(p => (p && d.jobs.some(j => j.id === p.id) ? p : d.jobs[0] ?? null));
    } catch (e) { setJobs({ loading: false, error: e instanceof Error ? e.message : 'Error', items: [] }); }
  };
  const refreshTrends = async (d: 7 | 30 = trendDays) => {
    setTrendLoading(true);
    try { const r = await fetchAdminTrends(d, isEn ? 'en' : 'fr'); setTrendPoints(r.points); } catch { setTrendPoints([]); }
    finally { setTrendLoading(false); }
  };
  const refreshFeedbacks = async () => {
    setFeedbackLoading(true);
    try { const d = await fetchAppFeedbacks(100); setFeedbacks(d.items); setFeedbackAvg(d.summary.averageRating || 0); setFeedbackCount(d.summary.count || 0); }
    catch { setFeedbacks([]); } finally { setFeedbackLoading(false); }
  };
  const refreshUsers = async (role = userRoleFilter) => {
    setUsersLoading(true);
    try { const r = await fetch(`${API}/api/admin/users?limit=100${role ? `&role=${role}` : ''}`); const d = await r.json(); setAdminUsers(d.users || []); }
    catch { setAdminUsers([]); } finally { setUsersLoading(false); }
  };
  const refreshReviews = async () => {
    setReviewsLoading(true);
    try { const r = await fetch(`${API}/api/admin/reviews?limit=100`); const d = await r.json(); setAdminReviews(d.reviews || []); setReviewAlerts(d.alerts || []); }
    catch { setAdminReviews([]); setReviewAlerts([]); } finally { setReviewsLoading(false); }
  };

  useEffect(() => { refreshStats(); refreshVerifications(); refreshJobs(); refreshTrends(7); refreshFeedbacks(); }, []);
  useEffect(() => { refreshJobs(jobStatusFilter); }, [jobStatusFilter]);
  useEffect(() => { refreshTrends(trendDays); }, [trendDays, locale]);

  const pendingCount = useMemo(() => items.filter(i => i.status === 'pending').length, [items]);
  const pendingJobCount = useMemo(() => jobs.items.filter(j => j.status === 'PENDING').length, [jobs.items]);

  const actVerification = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    try { await reviewVerificationSubmission({ id, status, reviewedBy: reviewer || 'super-admin' }); await refreshVerifications(); } finally { setBusyId(null); }
  };
  const actJob = async (id: number, status: 'ACTIVE' | 'REJECTED') => {
    setBusyId(id);
    try { await updateJob(id, { status }); await refreshJobs(); } finally { setBusyId(null); }
  };

  const renderEvidence = (item: VerificationSubmission) => {
    const found = IMAGE_KEYS.map(m => ({ ...m, value: item.payload[m.key] })).filter(e => typeof e.value === 'string' && (e.value as string).startsWith('data:image/'));
    if (!found.length) return <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-500">{isEn ? 'No image proof.' : 'Aucune preuve image.'}</div>;
    return (
      <div className="grid grid-cols-2 gap-2">
        {found.map(e => (
          <div key={e.key} className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-2 py-1 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase">{isEn ? e.en : e.fr}</div>
            <img src={e.value as string} alt={e.key} className="w-full h-32 object-cover bg-gray-100" />
          </div>
        ))}
      </div>
    );
  };

  const navItems: { key: PanelMode; icon: string; label: string; badge?: number }[] = [
    { key: 'dashboard', icon: '📊', label: isEn ? 'Dashboard' : 'Tableau de bord' },
    { key: 'moderation', icon: '🛡️', label: isEn ? 'Moderation' : 'Moderation', badge: pendingCount + pendingJobCount },
    { key: 'users', icon: '👥', label: isEn ? 'Users' : 'Utilisateurs' },
    { key: 'reviews', icon: '⭐', label: isEn ? 'Reviews & Alerts' : 'Avis & Alertes' },
    { key: 'trends', icon: '📈', label: isEn ? 'Trends' : 'Tendances' },
    { key: 'feedbacks', icon: '💬', label: isEn ? 'App Feedback' : 'Retours App' },
  ];

  return (
    <div className="min-h-screen text-black bg-[radial-gradient(circle_at_20%_0%,#ecfdf5_0%,#f8fafc_35%,#f1f5f9_100%)]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">{isEn ? 'Command Center' : 'Centre de Commande'} 🗼</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">237jobs Super Admin — 24/7</p>
          </div>
          <Link href={localizePath('/')} className="text-sm font-bold text-green-700 hover:underline">{isEn ? 'Back to home' : 'Retour a l\'accueil'}</Link>
        </div>

        {/* Nav tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {navItems.map(n => (
            <button key={n.key} onClick={() => {
              setMode(n.key);
              if (n.key === 'users') refreshUsers();
              if (n.key === 'reviews') refreshReviews();
            }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${mode === n.key ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              <span>{n.icon}</span> {n.label}
              {n.badge ? <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{n.badge}</span> : null}
            </button>
          ))}
        </div>

        {/* ══════ DASHBOARD ══════ */}
        {mode === 'dashboard' && (
          <div className="space-y-6">
            {/* Live stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: isEn ? 'Total Users' : 'Utilisateurs', value: stats.users, icon: '👥', color: 'border-blue-200' },
                { label: isEn ? 'Signups Today' : 'Inscriptions aujourd\'hui', value: stats.todaySignups, icon: '🆕', color: 'border-green-200' },
                { label: isEn ? 'Pending Jobs' : 'Annonces en attente', value: stats.pendingJobs, icon: '⏳', color: 'border-amber-200' },
                { label: isEn ? 'Active Jobs' : 'Annonces actives', value: stats.approvedJobs, icon: '✅', color: 'border-green-200' },
                { label: isEn ? 'Open Reports' : 'Signalements ouverts', value: stats.reports, icon: '🚨', color: 'border-red-200' },
                { label: isEn ? 'Identity Queue' : 'File identite', value: pendingCount, icon: '🛡️', color: 'border-purple-200' },
                { label: isEn ? 'Total Reviews' : 'Total avis', value: stats.totalReviews, icon: '⭐', color: 'border-amber-200' },
                { label: isEn ? 'Enterprise Pending' : 'Entreprises non verifiees', value: stats.enterprisePending, icon: '🏢', color: 'border-blue-200' },
              ].map((s, i) => (
                <div key={i} className={`bg-white rounded-2xl border ${s.color} p-4 shadow-sm`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{s.icon}</span>
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-bold">{s.label}</p>
                  </div>
                  <p className="text-2xl font-extrabold">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-extrabold mb-3">{isEn ? 'Quick Actions' : 'Actions Rapides'}</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setMode('moderation')} className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-100 transition">
                  🛡️ {isEn ? `Review ${pendingCount + pendingJobCount} pending` : `Valider ${pendingCount + pendingJobCount} en attente`}
                </button>
                <button onClick={() => { setMode('reviews'); refreshReviews(); }} className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold hover:bg-red-100 transition">
                  ⚠️ {isEn ? 'Check review alerts' : 'Verifier alertes avis'}
                </button>
                <button onClick={() => { setMode('users'); refreshUsers(); }} className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition">
                  👥 {isEn ? 'View all users' : 'Voir tous les utilisateurs'}
                </button>
              </div>
            </div>

            {/* Mini trend chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-extrabold mb-3">{isEn ? 'Activity (7 days)' : 'Activite (7 jours)'}</h3>
              {trendLoading ? <p className="text-sm text-gray-400">...</p> : (
                <div className="w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendPoints} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" stroke="#6b7280" fontSize={11} />
                      <YAxis allowDecimals={false} stroke="#6b7280" fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="users" name={isEn ? 'Signups' : 'Inscriptions'} stroke="#16a34a" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="jobs" name={isEn ? 'Jobs' : 'Annonces'} stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════ MODERATION ══════ */}
        {mode === 'moderation' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-green-100 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-green-700 font-extrabold">{isEn ? 'Identity queue' : 'File identite'}</p>
                <p className="text-3xl font-extrabold mt-2">{pendingCount}</p>
              </div>
              <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-amber-700 font-extrabold">{isEn ? 'Job ads' : 'Annonces'}</p>
                <p className="text-3xl font-extrabold mt-2">{jobs.items.length}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-600 font-extrabold">{isEn ? 'Reviewer' : 'Validateur'}</p>
                <input value={reviewer} onChange={e => setReviewer(e.target.value)} className="mt-1 w-full p-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {/* Verifications */}
              <section className="xl:col-span-3 space-y-4">
                <h3 className="font-extrabold">{isEn ? 'Identity Verifications' : 'Verifications d\'identite'}</h3>
                {items.length === 0 && <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">{isEn ? 'No submissions.' : 'Aucune soumission.'}</div>}
                {items.map(item => (
                  <article key={item.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-extrabold">{item.displayName}</p>
                        <p className="text-xs text-gray-500">{item.role} • {item.phone} • {item.accountKey}</p>
                      </div>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${statusPill(item.status)}`}>{item.status}</span>
                    </div>
                    {renderEvidence(item)}
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => actVerification(item.id, 'approved')} disabled={busyId === item.id}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">{isEn ? 'APPROVE' : 'APPROUVER'}</button>
                      <button onClick={() => actVerification(item.id, 'rejected')} disabled={busyId === item.id}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">{isEn ? 'REJECT' : 'REJETER'}</button>
                    </div>
                  </article>
                ))}
              </section>

              {/* Job ads */}
              <section className="xl:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 font-extrabold text-sm">{isEn ? 'Job Ads' : 'Annonces'}</div>
                  <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-1.5">
                    {(['ALL', 'PENDING', 'ACTIVE', 'REJECTED'] as JobStatusFilter[]).map(f => (
                      <button key={f} onClick={() => setJobStatusFilter(f)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${jobStatusFilter === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {f === 'ALL' ? (isEn ? 'All' : 'Tous') : f}
                      </button>
                    ))}
                  </div>
                  {jobs.loading && <p className="px-4 py-5 text-sm text-gray-500">{isEn ? 'Loading...' : 'Chargement...'}</p>}
                  <div className="max-h-80 overflow-auto divide-y divide-gray-100">
                    {jobs.items.map(job => (
                      <button key={job.id} onClick={() => setSelectedJob(job)}
                        className={`w-full text-left px-4 py-3 hover:bg-green-50 ${selectedJob?.id === job.id ? 'bg-green-50' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold truncate">{job.title}</p>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusPill(job.status)}`}>{job.status}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{job.company} • {job.location}</p>
                        {job.author && <p className="text-xs text-gray-400 truncate">{isEn ? 'By' : 'Par'}: {job.author.name || job.author.email} {job.author.role ? `(${job.author.role})` : ''}</p>}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedJob && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border mb-3 ${statusPill(selectedJob.status)}`}>{selectedJob.status}</span>
                    <h3 className="text-lg font-extrabold mb-1">{selectedJob.title}</h3>
                    <p className="text-sm text-gray-600 mb-1">{selectedJob.company} • {selectedJob.location}</p>
                    {selectedJob.author && <p className="text-xs text-gray-500 mb-3">{isEn ? 'By' : 'Par'}: <b>{selectedJob.author.name || selectedJob.author.email}</b> {selectedJob.author.role ? `(${selectedJob.author.role})` : ''}</p>}
                    <p className="text-sm text-gray-700 whitespace-pre-line mb-4">{selectedJob.description}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedJob.status === 'PENDING' && <>
                        <button onClick={() => actJob(selectedJob.id, 'ACTIVE')} disabled={busyId === selectedJob.id} className="w-full px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">{isEn ? 'APPROVE' : 'APPROUVER'}</button>
                        <button onClick={() => actJob(selectedJob.id, 'REJECTED')} disabled={busyId === selectedJob.id} className="w-full px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50">{isEn ? 'REJECT' : 'REJETER'}</button>
                      </>}
                      {selectedJob.status === 'REJECTED' && <button onClick={() => actJob(selectedJob.id, 'ACTIVE')} disabled={busyId === selectedJob.id} className="w-full px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-50">{isEn ? 'RE-APPROVE' : 'RE-APPROUVER'}</button>}
                      {(selectedJob.status === 'ACTIVE' || selectedJob.status === 'APPROVED') && <button onClick={() => actJob(selectedJob.id, 'REJECTED')} disabled={busyId === selectedJob.id} className="w-full px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50">{isEn ? 'REJECT' : 'REJETER'}</button>}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ══════ USERS ══════ */}
        {mode === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <h3 className="font-extrabold text-lg">{isEn ? 'All Users' : 'Tous les Utilisateurs'}</h3>
              <div className="flex gap-1 ml-auto">
                {['', 'CANDIDAT', 'ENTREPRISE', 'ARTISAN'].map(r => (
                  <button key={r} onClick={() => { setUserRoleFilter(r); refreshUsers(r); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${userRoleFilter === r ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                    {r || (isEn ? 'All' : 'Tous')}
                  </button>
                ))}
              </div>
            </div>
            {usersLoading && <p className="text-sm text-gray-400">{isEn ? 'Loading...' : 'Chargement...'}</p>}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-bold text-gray-600">ID</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-600">{isEn ? 'Name' : 'Nom'}</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-600">Email</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-600">{isEn ? 'Role' : 'Role'}</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-600">{isEn ? 'Verified' : 'Verifie'}</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-600">{isEn ? 'Signed up' : 'Inscription'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {adminUsers.map(u => (
                      <tr key={u.id} className={`hover:bg-gray-50 ${u.isBanned ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{u.id}</td>
                        <td className="px-4 py-3 font-bold">{u.name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'ENTREPRISE' ? 'bg-blue-50 text-blue-700' : u.role === 'ARTISAN' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{u.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          {u.isVerified ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-400">—</span>}
                          {u.isBanned && <span className="ml-1 text-red-600 font-bold text-xs">BANNI</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!usersLoading && adminUsers.length === 0 && <p className="p-6 text-center text-gray-400">{isEn ? 'No users found.' : 'Aucun utilisateur.'}</p>}
            </div>
          </div>
        )}

        {/* ══════ REVIEWS & ALERTS ══════ */}
        {mode === 'reviews' && (
          <div className="space-y-6">
            {/* Alerts */}
            {reviewAlerts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <h3 className="font-extrabold text-red-700 mb-3">⚠️ {isEn ? 'Low Rating Alerts' : 'Alertes Mauvaises Notes'}</h3>
                <p className="text-sm text-red-600 mb-3">{isEn ? 'These users received multiple bad reviews (avg ≤ 2.5/5). Consider reviewing their activity.' : 'Ces utilisateurs ont recu plusieurs mauvais avis (moy ≤ 2.5/5). Verifiez leur activite.'}</p>
                <div className="space-y-2">
                  {reviewAlerts.map(a => (
                    <div key={a.userId} className="flex items-center justify-between bg-white border border-red-100 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-bold text-sm">{a.name || `User #${a.userId}`}</p>
                        <p className="text-xs text-gray-500">{a.role} • {a.reviewCount} {isEn ? 'reviews' : 'avis'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-red-600">{a.averageRating}/5</p>
                        <p className="text-amber-500 text-xs">{'★'.repeat(Math.round(a.averageRating))}{'☆'.repeat(5 - Math.round(a.averageRating))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {reviewAlerts.length === 0 && !reviewsLoading && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                <p className="text-green-700 font-bold">✅ {isEn ? 'No low rating alerts. The community is healthy!' : 'Aucune alerte. La communaute est saine !'}</p>
              </div>
            )}

            {/* All reviews */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-extrabold mb-4">{isEn ? 'All Reviews' : 'Tous les Avis'} ({adminReviews.length})</h3>
              {reviewsLoading && <p className="text-sm text-gray-400">{isEn ? 'Loading...' : 'Chargement...'}</p>}
              <div className="space-y-3 max-h-[500px] overflow-auto">
                {adminReviews.map(r => (
                  <article key={r.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-bold">{r.reviewer?.name || r.reviewer?.email || '?'} → {r.reviewed?.name || r.reviewed?.email || '?'}</p>
                        <p className="text-xs text-gray-400">{r.reviewer?.role || ''} → {r.reviewed?.role || ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-500 text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                        <p className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{r.comment}</p>
                  </article>
                ))}
                {!reviewsLoading && adminReviews.length === 0 && <p className="text-sm text-gray-400 text-center">{isEn ? 'No reviews yet.' : 'Aucun avis pour le moment.'}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ══════ TRENDS ══════ */}
        {mode === 'trends' && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-xl font-extrabold">{isEn ? 'Registrations vs Publications' : 'Inscriptions vs Publications'}</h2>
              <div className="inline-flex gap-2">
                <button onClick={() => setTrendDays(7)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${trendDays === 7 ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>7 {isEn ? 'days' : 'jours'}</button>
                <button onClick={() => setTrendDays(30)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${trendDays === 30 ? 'bg-green-600 text-white' : 'bg-gray-100'}`}>30 {isEn ? 'days' : 'jours'}</button>
              </div>
            </div>
            {trendLoading ? <p className="text-sm text-gray-500">...</p> : trendPoints.length === 0 ? <p className="text-sm text-gray-500">{isEn ? 'No data.' : 'Aucune donnee.'}</p> : (
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

        {/* ══════ FEEDBACKS ══════ */}
        {mode === 'feedbacks' && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-amber-700 font-extrabold">{isEn ? 'Avg rating' : 'Note moyenne'}</p>
                <p className="text-3xl font-extrabold mt-2">{feedbackAvg.toFixed(1)}/5</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-gray-600 font-extrabold">{isEn ? 'Total' : 'Total'}</p>
                <p className="text-3xl font-extrabold mt-2">{feedbackCount}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              {feedbackLoading ? <p className="text-sm text-gray-500">...</p> : feedbacks.length === 0 ? <p className="text-sm text-gray-500">{isEn ? 'No feedback.' : 'Aucun retour.'}</p> : (
                <div className="space-y-3">
                  {feedbacks.map(f => (
                    <article key={f.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <p className="font-extrabold">{f.authorName || `User #${f.userId || 'guest'}`}</p>
                        <p className="text-xs text-gray-500">{new Date(f.createdAt).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}</p>
                      </div>
                      <p className="text-amber-500 text-sm mb-2">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</p>
                      <p className="text-sm text-gray-700">{f.comment}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
