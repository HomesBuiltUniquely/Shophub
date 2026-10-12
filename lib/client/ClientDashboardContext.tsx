'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClientDashboardData } from './types';
import { mapErpToDashboard } from './erpMapper';

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
  const urlLeadId = searchParams?.get('leadId') || '';

  const [leadId, setLeadId] = useState<string>(urlLeadId);
  const [data, setData] = useState<ClientDashboardData>(defaultInitialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState<boolean>(false);

  const fetchDashboardData = useCallback(async (currentLeadId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const endpoint = currentLeadId
        ? `/api/client/dashboard?leadId=${encodeURIComponent(currentLeadId)}`
        : `/api/client/dashboard`;

      const res = await fetch(endpoint, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Failed to load dashboard: ${res.status}`);
      }

      const json = await res.json();
      if (json.data) {
        setData(json.data);
        if (json.data.profile?.leadId && !currentLeadId) {
          setLeadId(json.data.profile.leadId);
        }
      }
    } catch (err: unknown) {
      console.warn('[ClientDashboardContext] Using local fallback:', (err as Error).message);
      setError((err as Error).message);
      // Fallback
      setData(mapErpToDashboard({}, currentLeadId || '1691'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(leadId);
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
