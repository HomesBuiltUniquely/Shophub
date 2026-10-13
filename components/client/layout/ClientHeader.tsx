'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useClientDashboard } from '@/lib/client/ClientDashboardContext';
import { SearchIcon, BellWithBadgeIcon } from '../icons/ClientIcons';
import SignOutButton from '@/components/auth/SignOutButton';

interface ClientHeaderProps {
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  pageTitle?: string;
}

export default function ClientHeader({
  onSearch,
  searchPlaceholder = 'Search my project...',
  pageTitle,
}: ClientHeaderProps) {
  const [searchVal, setSearchVal] = useState('');
  const { data, openContactModal } = useClientDashboard();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="sticky top-0 z-20 w-full bg-[#FAF7F2]/90 backdrop-blur-md px-8 py-4 flex items-center justify-between border-b border-[#EFECE6]/40">
      {/* Left side: Page Title (e.g. My Hub) & Search Input */}
      <div className="flex items-center gap-5 w-full max-w-lg">
        {pageTitle && (
          <span className="text-lg sm:text-xl font-black text-gray-950 tracking-tight shrink-0">
            {pageTitle}
          </span>
        )}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchVal}
            onChange={handleSearch}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-[#EFEBE3] text-gray-900 placeholder-gray-500 text-sm rounded-full border-none focus:outline-none focus:ring-2 focus:ring-black/20 transition-all"
          />
        </div>
      </div>


      {/* Right Controls */}
      <div className="flex items-center gap-6 pl-4">
        <button
          type="button"
          onClick={openContactModal}
          className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
        >
          Contact RM
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          className="p-1.5 text-gray-700 hover:text-gray-900 transition-colors rounded-full hover:bg-black/5"
          aria-label="Notifications"
        >
          <BellWithBadgeIcon className="w-5 h-5" />
        </button>

        <SignOutButton className="text-sm font-medium text-gray-700 hover:text-gray-900" />

        {/* Divider */}
        <div className="h-7 w-[1px] bg-gray-300/80" />

        {/* User Profile */}
        <div className="flex items-center gap-3 select-none">
          <div className="text-right whitespace-nowrap">
            <div className="text-sm font-bold text-gray-900 leading-tight">
              {data.profile.name}
            </div>
            <div className="text-[10.5px] font-semibold tracking-wider text-gray-500 uppercase">
              {data.profile.memberTier || `CLIENT ID #${data.profile.clientId}`}
            </div>
          </div>
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gray-300 ring-1 ring-black/10 shrink-0">
            {data.profile.avatarUrl?.startsWith('/') ? (
              <img src={data.profile.avatarUrl} alt={data.profile.name} className="h-full w-full object-cover" />
            ) : (
              <Image
                src={data.profile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={data.profile.name}
                fill
                className="object-cover"
                sizes="36px"
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
