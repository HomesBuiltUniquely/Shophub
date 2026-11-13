'use client';

/**
 * ==============================================================================
 * COMPONENT: components/brands/BrandsHeader.tsx
 * PURPOSE: Top Fixed ERP Header Bar (Search, Alerts, Help, + CREATE OFFERING)
 * ==============================================================================
 * DESIGN & LAYOUT:
 * - Title: "ERP Offerings"
 * - Search input: Real-time debounced query that filters brands, manufacturers, and codes.
 * - Right controls: Notification bell with badge, help icon, "+ CREATE OFFERING" button,
 *   and profile avatar.
 * ==============================================================================
 */

import React from 'react';
import { MobileNavButton } from '@/components/layout/MobileNav';

interface BrandsHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateOffering?: () => void;
}

export default function BrandsHeader({

  searchQuery,
  onSearchChange,
  onCreateOffering,
}: BrandsHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200/80 fixed top-0 right-0 left-0 lg:left-56 z-20 flex items-center justify-between px-3 sm:px-6 lg:px-8 gap-3">
      {/* Left Title: ERP Offerings */}
      <div className="flex items-center gap-1 flex-shrink-0 min-w-0">
        <MobileNavButton />
        <div className="hidden sm:block">
        <span className="text-xs font-bold text-gray-500 tracking-wider block -mb-1">ERP</span>
        <span className="text-lg font-extrabold text-gray-950 tracking-tight">Offerings</span>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search brands, codes, or manufacturers..."
            className="w-full pl-10 pr-4 py-2 bg-[#F9FAFB] hover:bg-[#F3F4F6]/80 focus:bg-white text-xs font-medium text-gray-900 placeholder-gray-400 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Bell Icon with dot */}
        <button
          className="relative p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          title="Notifications"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Question Mark Help Icon */}
        <button
          className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          title="Help & Support"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01" />
          </svg>
        </button>

        {/* + CREATE OFFERING Button */}
        <button
          onClick={onCreateOffering}
          className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs uppercase tracking-wide cursor-pointer"
        >
          <span className="text-sm font-extrabold leading-none">+</span>
          <span className="hidden sm:inline">CREATE OFFERING</span>
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 ring-1 ring-black/5 bg-gray-100">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"
              alt="User Avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
