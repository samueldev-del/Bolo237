"use client";

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';

type FraudReportButtonProps = {
  targetType: 'annonce' | 'artisan';
  targetId: string;
  compact?: boolean;
  onAutoMaskedChange?: (masked: boolean) => void;
};

type ReportReason = 'demande-argent' | 'fausse-identite' | 'artisan-injoignable';

type ReportEntry = {
  reporterId: string;
  reason: ReportReason;
  createdAt: string;
};

const REPORTER_KEY = '237jobs-reporter-id';

function getOrCreateReporterId() {
  if (typeof window === 'undefined') {
    return 'server';
  }
  const existing = window.localStorage.getItem(REPORTER_KEY);
  if (existing) {
    return existing;
  }
  const id = `r-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(REPORTER_KEY, id);
  return id;
}

export default function FraudReportButton({ targetType, targetId, compact = false, onAutoMaskedChange }: FraudReportButtonProps) {
  const { t } = useLocale();
  const storageKey = useMemo(() => `237jobs-reports-${targetType}-${targetId}`, [targetId, targetType]);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('demande-argent');
  const [uniqueReportCount, setUniqueReportCount] = useState(0);
  const [alreadyReported, setAlreadyReported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = window.localStorage.getItem(storageKey);
    const reports: ReportEntry[] = raw ? JSON.parse(raw) : [];
    const reporterId = getOrCreateReporterId();
    const uniqueCount = new Set(reports.map((item) => item.reporterId)).size;
    setUniqueReportCount(uniqueCount);
    setAlreadyReported(reports.some((item) => item.reporterId === reporterId));
    onAutoMaskedChange?.(uniqueCount >= 3);
  }, [onAutoMaskedChange, storageKey]);

  const submitReport = () => {
    if (typeof window === 'undefined' || alreadyReported) {
      return;
    }
    const reporterId = getOrCreateReporterId();
    const raw = window.localStorage.getItem(storageKey);
    const reports: ReportEntry[] = raw ? JSON.parse(raw) : [];
    if (reports.some((item) => item.reporterId === reporterId)) {
      setAlreadyReported(true);
      return;
    }

    const next = [...reports, { reporterId, reason, createdAt: new Date().toISOString() }];
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    const uniqueCount = new Set(next.map((item) => item.reporterId)).size;
    setUniqueReportCount(uniqueCount);
    setAlreadyReported(true);
    setIsOpen(false);
    onAutoMaskedChange?.(uniqueCount >= 3);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`inline-flex items-center gap-2 font-bold rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition ${compact ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'}`}
      >
        🚩 {t.security.reportFraud}
      </button>

      {isOpen && (
        <div className="bg-white border border-red-100 rounded-xl p-3 shadow-sm space-y-2">
          <p className="text-xs font-bold text-gray-700">{t.security.reportReasonTitle}</p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
            className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2"
          >
            <option value="demande-argent">{t.security.reportReasonMoney}</option>
            <option value="fausse-identite">{t.security.reportReasonIdentity}</option>
            <option value="artisan-injoignable">{t.security.reportReasonArtisan}</option>
          </select>
          <button
            onClick={submitReport}
            disabled={alreadyReported}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-extrabold rounded-lg py-2"
          >
            {alreadyReported ? t.security.alreadyReported : t.security.sendReport}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500 font-medium">
        {uniqueReportCount} {t.security.uniqueReports}
      </p>
    </div>
  );
}