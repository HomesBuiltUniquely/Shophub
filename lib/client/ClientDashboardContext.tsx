'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientDashboardData } from './types';
import { mapErpToDashboard } from './erpMapper';
import { CLIENT_PROFILE_UPDATED_EVENT, type ClientSavedProfile } from './client-profile';

interface ClientDashboardContextValue {
  data: ClientDashboardData;
  isLoading: boolean;
  isLiveBackend: boolean;
  error: string | null;
  leadId: string;
  setLeadId: (leadId: string) => void;
  refreshDashboard: () => Promise<void>;
  isContactModalOpen: boolean;
  openContactModal: () => void;
  closeContactModal: () => void;
}

const defaultLeadId = process.env.NEXT_PUBLIC_DEFAULT_CLIENT_LEAD_ID || '2399';
const defaultInitialData: ClientDashboardData = mapErpToDashboard({}, defaultLeadId);

const ClientDashboardContext = createContext<ClientDashboardContextValue | null>(null);

export function ClientDashboardProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const initialLeadId = searchParams?.get('leadId') || defaultLeadId;

  const [leadId, setLeadId] = useState<string>(initialLeadId);
  const [data, setData] = useState<ClientDashboardData>(defaultInitialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);

  const mergeSavedProfile = useCallback(async (base: ClientDashboardData): Promise<ClientDashboardData> => {
    try {
      const res = await fetch('/api/client/profile', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return base;
      const json = await res.json();
      const saved = json?.profile as ClientSavedProfile | undefined;
      if (!saved) return base;
      return {
        ...base,
        profile: {
          ...base.profile,
          name: saved.displayName || base.profile.name,
          avatarUrl: saved.avatarUrl || base.profile.avatarUrl,
          phone: saved.phone || base.profile.phone,
          email: saved.email || base.profile.email,
          propertyDetails: saved.location || base.profile.propertyDetails,
          propertyType: saved.propertyType || base.profile.propertyType,
        },
      };
    } catch {
      return base;
    }
  }, []);

  const fetchDashboardData = useCallback(async (currentLeadId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(`/api/client/dashboard?leadId=${encodeURIComponent(currentLeadId)}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Failed to load dashboard: ${res.status}`);
      }

      const json = await res.json();
      if (json.data) {
        setData(await mergeSavedProfile(json.data));
      }
    } catch (err: unknown) {
      console.warn('[ClientDashboardContext] Using local fallback:', (err as Error).message);
      setError((err as Error).message);
      setData(await mergeSavedProfile(mapErpToDashboard({}, currentLeadId)));
    } finally {
      setIsLoading(false);
    }
  }, [mergeSavedProfile]);

  useEffect(() => {
    fetchDashboardData(leadId);
  }, [leadId, fetchDashboardData]);

  useEffect(() => {
    const sync = () => {
      fetchDashboardData(leadId);
    };
    window.addEventListener(CLIENT_PROFILE_UPDATED_EVENT, sync);
    return () => window.removeEventListener(CLIENT_PROFILE_UPDATED_EVENT, sync);
  }, [leadId, fetchDashboardData]);

  const refreshDashboard = useCallback(async () => {
    await fetchDashboardData(leadId);
  }, [leadId, fetchDashboardData]);

  const openContactModal = () => setIsContactModalOpen(true);
  const closeContactModal = () => setIsContactModalOpen(false);

  return (
    <ClientDashboardContext.Provider
      value={{
        data,
        isLoading,
        isLiveBackend: data.isLiveBackend,
        error,
        leadId,
        setLeadId,
        refreshDashboard,
        isContactModalOpen,
        openContactModal,
        closeContactModal,
      }}
    >
      {children}
    </ClientDashboardContext.Provider>
  );
}

export function useClientDashboard(): ClientDashboardContextValue {
  const ctx = useContext(ClientDashboardContext);
  if (!ctx) {
    throw new Error('useClientDashboard must be used within a ClientDashboardProvider');
  }
  return ctx;
}
