'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type MobileNavValue = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const MobileNavContext = createContext<MobileNavValue | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, toggle, close }), [open, toggle, close]);

  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav() {
  const value = useContext(MobileNavContext);
  if (!value) {
    return { open: false, toggle: () => {}, close: () => {} };
  }
  return value;
}

export function MobileNavButton({ className = '' }: { className?: string }) {
  const { open, toggle } = useMobileNav();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      className={`inline-flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-700 hover:bg-black/5 ${className}`}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {open ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  );
}
