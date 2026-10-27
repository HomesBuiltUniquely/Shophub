'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClientDashboard } from '@/lib/client/ClientDashboardContext';
import { CLIENT_NAV_ITEMS } from '@/lib/client/clientData';
import {
  HubLogo,
  HomeIcon,
  MyProjectIcon,
  QuotationsIcon,
  OfferingsIcon,
  PaymentsIcon,
  InvoicesIcon,
  SettingsIcon,
} from '../icons/ClientIcons';

function FeedbackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'home': HomeIcon,
  'my-project': MyProjectIcon,
  'quotations': QuotationsIcon,
  'offerings': OfferingsIcon,
  'payments': PaymentsIcon,
  'invoices': InvoicesIcon,
  'feedback': FeedbackIcon,
  'settings': SettingsIcon,
};

export default function ClientSidebar() {
  const pathname = usePathname();
  const { openContactModal } = useClientDashboard();

  return (
    <aside className="w-64 bg-[#FAF7F2] flex flex-col h-screen fixed left-0 top-0 z-30 border-r border-[#EFECE6]/60 select-none overflow-y-auto">
      {/* Brand Header */}
      <div className="px-7 pt-7 pb-6">
        <Link href="/client" className="inline-flex flex-col items-start gap-1">
          <HubLogo />
          <div className="text-[10px] font-bold text-gray-400 tracking-[0.22em] uppercase">
            Client portal
          </div>
        </Link>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 space-y-1">
        {CLIENT_NAV_ITEMS.map((item) => {
          const IconComponent = ICON_MAP[item.iconId] || HomeIcon;
          const isActive =
            item.iconId === 'home'
              ? pathname === '/client' || pathname === '/'
              : pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-full text-[13.5px] font-medium transition-all ${
                isActive
                  ? 'bg-[#EAE5DA] text-gray-900 font-semibold shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-[#F2ECE1]/70'
              }`}
            >
              <IconComponent
                className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                  isActive ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'
                }`}
              />
              <span className="truncate">{item.name}</span>

              {/* Right edge active indicator matching screenshot */}
              {isActive && (
                <span
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-black rounded-l-full"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Contact RM Button */}
      <div className="p-5 pt-3">
        <button
          type="button"
          onClick={openContactModal}
          className="w-full bg-black hover:bg-zinc-800 text-white text-sm font-semibold py-3 px-4 rounded-full transition-colors shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>Contact RM</span>
        </button>
      </div>
    </aside>
  );
}
