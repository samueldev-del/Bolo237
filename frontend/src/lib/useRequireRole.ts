'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';

type Role = 'CANDIDAT' | 'ENTREPRISE' | 'ARTISAN' | 'ADMIN' | 'SUPER_ADMIN';

const DASHBOARD_PATH_BY_ROLE: Partial<Record<Role, string>> = {
  CANDIDAT: '/dashboard',
  ENTREPRISE: '/dashboard-entreprise',
  ARTISAN: '/dashboard-artisan',
};

// Reads the persisted role from localStorage and redirects mismatched users to
// their correct dashboard. Centralizes the duplicated effect across dashboard pages.
export function useRequireRole(expected: Role) {
  const router = useRouter();
  const { localizePath } = useLocale();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let role: string | null = null;
    try {
      const raw = localStorage.getItem('bolo237-user');
      if (raw) {
        const parsed = JSON.parse(raw) as { role?: unknown };
        if (typeof parsed.role === 'string') role = parsed.role;
      }
    } catch {
      role = null;
    }
    if (!role) {
      role = localStorage.getItem('bolo237-account-role');
    }

    const normalized = String(role || '').toUpperCase() as Role;
    if (!normalized || normalized === expected) return;

    const target = DASHBOARD_PATH_BY_ROLE[normalized];
    if (target) {
      router.replace(localizePath(target));
    }
  }, [router, localizePath, expected]);
}
