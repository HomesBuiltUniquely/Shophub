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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'home': HomeIcon,
  'my-project': MyProjectIcon,
  'quotations': QuotationsIcon,
  'offerings': OfferingsIcon,
  'payments': PaymentsIcon,
  'invoices': InvoicesIcon,
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
