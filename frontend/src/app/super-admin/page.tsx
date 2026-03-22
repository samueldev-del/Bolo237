"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
import { listVerificationSubmissions, reviewVerification, VerificationSubmission } from '@/lib/verificationStore';

export default function SuperAdminPage() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';
  const [items, setItems] = useState<VerificationSubmission[]>([]);
  const [reviewer, setReviewer] = useState('super-admin');

  const refresh = () => setItems(listVerificationSubmissions());

  useEffect(() => {
    refresh();
  }, []);

  const pendingCount = useMemo(() => items.filter((i) => i.status === 'pending').length, [items]);

  const act = (id: string, status: 'approved' | 'rejected') => {
    reviewVerification({ id, status, reviewedBy: reviewer || 'super-admin' });
    refresh();
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-black">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold">{isEn ? 'Super Admin - Verification Queue' : 'Super Admin - File de verification'}</h1>
            <p className="text-sm text-gray-600 font-medium mt-1">
              {isEn
                ? `Pending requests: ${pendingCount}`
                : `Demandes en attente: ${pendingCount}`}
            </p>
          </div>
          <Link href={localizePath('/')} className="text-sm font-bold text-green-700 hover:underline">
            {isEn ? 'Back to home' : 'Retour a l accueil'}
          </Link>
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

        <div className="space-y-4">
          {items.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 font-medium">
              {isEn ? 'No verification submission yet.' : 'Aucune soumission de verification pour le moment.'}
            </div>
          )}

          {items.map((item) => (
            <article key={item.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-extrabold text-gray-900">{item.displayName}</p>
                  <p className="text-xs text-gray-500 font-medium">{item.role} • {item.phone} • {item.accountKey}</p>
                </div>
                <span className={`inline-flex w-fit px-3 py-1 rounded-full text-xs font-bold border ${item.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : item.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {item.status}
                </span>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 mb-4 overflow-auto">
                <pre>{JSON.stringify(item.payload, null, 2)}</pre>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => act(item.id, 'approved')}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition"
                >
                  {isEn ? 'Approve' : 'Approuver'}
                </button>
                <button
                  onClick={() => act(item.id, 'rejected')}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition"
                >
                  {isEn ? 'Reject' : 'Rejeter'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
