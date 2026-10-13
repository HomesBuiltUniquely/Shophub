'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import SignOutButton from '@/components/auth/SignOutButton';
import { firstNameFrom, roleLabel, useCurrentUser } from '@/lib/auth/useCurrentUser';
import { isInternalStaff } from '@/lib/auth/session';
import { readLocalProfile } from '@/lib/profile-local';

interface TopHeaderProps {
  title?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  extraActions?: ReactNode;
}

export default function TopHeader({
  title = 'Offerings',
  searchQuery: controlledQuery,
  onSearchChange,
  onSearch,
  placeholder = 'Search product SKU...',
  extraActions,
}: TopHeaderProps) {
  const router = useRouter();
  const user = useCurrentUser();
  const [internalQuery, setInternalQuery] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const searchQuery = controlledQuery ?? internalQuery;

  useEffect(() => {
    const sync = () => setAvatarUrl(readLocalProfile().avatarUrl);
    sync();
    window.addEventListener('shophub-profile-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('shophub-profile-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const handleSearch = (query: string) => {
    if (controlledQuery === undefined) {
      setInternalQuery(query);
    }
    (onSearchChange || onSearch)?.(query);
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 fixed top-0 right-0 left-56 z-30">
      <div className="h-full px-6 flex items-center justify-between gap-6">
        {/* Left: Page Label */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-900 tracking-tight">{title}</span>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
              placeholder={placeholder}
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {extraActions}
          {/* Notifications with red dot */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          </button>

          {/* Help */}
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {!isInternalStaff(user) && (
            <button onClick={()=>router.push('/offerings/CreateOfferings')} className="flex items-center gap-2 bg-black text-white pl-3 pr-4 py-2 rounded-md text-xs font-semibold hover:bg-gray-800 transition-colors shadow-xs">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Offering</span>
            </button>
          )}

          <SignOutButton className="ml-1 rounded-md px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-950" />

          <div className="ml-1 flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-gray-900 leading-tight">
                {user?.name || 'Welcome'}
              </div>
              <div className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                {roleLabel(user) || 'User'}
              </div>
            </div>
            <button
              className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 hover:ring-2 hover:ring-gray-300 transition-all bg-gray-100 text-[10px] font-bold text-gray-700 grid place-items-center"
              title={user?.email || firstNameFrom(user)}
              onClick={() => router.push(isInternalStaff(user) ? '/quote-engine' : '/settings')}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : user?.name ? (
                <span>{firstNameFrom(user).slice(0, 1).toUpperCase()}</span>
              ) : (
                <Image src="/images/avatar.jpg" alt="User avatar" fill className="object-cover" sizes="32px" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
