"use client";

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { createReport, fetchReportSummary, type ApiReportSummary } from '@/lib/api';

type FraudReportButtonProps = {
  targetType: 'annonce' | 'artisan';
  targetId: string;
  compact?: boolean;
  onAutoMaskedChange?: (masked: boolean) => void;
};

type ReportReason = 'demande-argent' | 'fausse-identite' | 'artisan-injoignable';

const REPORTER_KEY = 'bolo237-reporter-id';
const REPORT_STORAGE_PREFIX = 'bolo237-report-submitted';

function isPositiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0;
}

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

function hasLocalSubmission(storageKey: string) {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(storageKey) === '1';
}

function rememberLocalSubmission(storageKey: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(storageKey, '1');
}

export default function FraudReportButton({ targetType, targetId, compact = false, onAutoMaskedChange }: FraudReportButtonProps) {
  const { t, locale } = useLocale();
  const storageKey = useMemo(() => `${REPORT_STORAGE_PREFIX}-${targetType}-${targetId}`, [targetId, targetType]);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('demande-argent');
  const [summary, setSummary] = useState<ApiReportSummary | null>(null);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateReporterId();
    setAlreadyReported(hasLocalSubmission(storageKey));

    if (!isPositiveInteger(targetId)) {
      setSummary(null);
      return;
    }

    let cancelled = false;
    fetchReportSummary(targetType, Number.parseInt(targetId, 10))
      .then((nextSummary) => {
        if (!cancelled) {
          setSummary(nextSummary);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [storageKey, targetId, targetType]);

  useEffect(() => {
    onAutoMaskedChange?.(Boolean(summary?.reviewThresholdReached));
  }, [onAutoMaskedChange, summary?.reviewThresholdReached]);

  const submitReport = async () => {
    if (typeof window === 'undefined' || alreadyReported || isSubmitting || !isPositiveInteger(targetId)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      getOrCreateReporterId();
      const response = await createReport({
        reason,
        targetType,
        targetId: Number.parseInt(targetId, 10),
      });

      rememberLocalSubmission(storageKey);
      setAlreadyReported(true);
      setSummary(response.summary);
      setIsOpen(false);
      setFeedback(t.security.reportSubmitted);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('déjà')) {
        rememberLocalSubmission(storageKey);
        setAlreadyReported(true);
      }
      setErrorMessage(message || t.security.reportError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReports = summary?.openReports ?? 0;

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
            disabled={alreadyReported || isSubmitting}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-extrabold rounded-lg py-2"
          >
            {alreadyReported ? t.security.alreadyReported : isSubmitting ? (locale === 'fr' ? 'Transmission...' : 'Submitting...') : t.security.sendReport}
          </button>
        </div>
      )}

      {feedback && (
        <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {feedback}
        </p>
      )}

      {errorMessage && (
        <p className="text-xs text-red-700 font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errorMessage}
        </p>
      )}

      <p className="text-xs text-gray-500 font-medium">
        {openReports} {t.security.uniqueReports}
      </p>
    </div>
  );
}