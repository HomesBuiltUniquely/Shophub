'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import CreateOfferingForm from './CreateOfferingForm';
import { isInternalStaff } from '@/lib/auth/session';
import { useAuthSession } from '@/lib/auth/useCurrentUser';

export default function CreateOfferings() {
  const router = useRouter();
  const { user, loading } = useAuthSession();

  useEffect(() => {
    if (!loading && isInternalStaff(user)) {
      router.replace('/offerings');
    }
  }, [loading, user, router]);

  if (!loading && isInternalStaff(user)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <TopHeader title="ERP Offerings" />
      <main className="ml-56 pt-16 min-h-screen bg-white">
        <Suspense fallback={<div className="p-10 text-sm text-gray-500">Loading offering form...</div>}>
          <CreateOfferingForm />
        </Suspense>
      </main>
    </div>
  );
}
