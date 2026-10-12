'use client';

import { useEffect, useState } from 'react';
import type { SessionUser } from './session';

export function useCurrentUser() {
  const { user } = useAuthSession();
  return user;
}

export function useAuthSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (!cancelled) setUser(data?.user || null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}

export function firstNameFrom(user?: SessionUser | null) {
  if (!user?.name) return 'there';
  return user.name.split(' ')[0] || user.name;
}

export function roleLabel(user?: SessionUser | null) {
  if (!user?.role) return '';
  if (user.role === 'admin') return 'Admin';
  if (user.role === 'enterprise') return 'Enterprise';
  if (user.role === 'crm') return user.loginSource === 'internal' ? 'Sales' : 'CRM Specialist';
  if (user.role === 'designer') return user.loginSource === 'internal' ? 'Design' : 'Designer';
  return 'Client';
}
