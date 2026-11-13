'use client';

import { useRef, ReactNode } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '@/lib/store/store';
import { MobileNavProvider } from '@/components/layout/MobileNav';

export default function StoreProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current}>
      <MobileNavProvider>{children}</MobileNavProvider>
    </Provider>
  );
}
