'use client';

import React from 'react';
import { MobileNavButton } from '@/components/layout/MobileNav';

interface QuoteTopNavProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  cartItemCount?: number;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function QuoteTopNav({
  searchQuery,
  onSearchChange,
  activeTab = 'Quote Engine',
  onTabChange,
  cartItemCount = 0,
  onToggleSidebar,
  isSidebarOpen = false,
}: QuoteTopNavProps) {
  return (
    <header className="bg-white border-b border-gray-200 h-16 fixed top-0 left-0 lg:left-56 right-0 z-30 flex items-center justify-between gap-3 px-3 sm:px-6">
      <MobileNavButton />
      {/* Left Navigation Tabs */}
      <div className="flex items-center gap-4 sm:gap-8 h-full min-w-0 overflow-x-auto">
        <button
          onClick={() => onTabChange && onTabChange('ERP Offerings')}
          className={`text-sm h-full flex items-center px-1 transition-colors ${
            activeTab === 'ERP Offerings'
              ? 'font-bold text-black border-b-2 border-black'
              : 'font-semibold text-gray-700 hover:text-black'
          }`}
        >
          ERP Offerings
        </button>
        <button
          onClick={() => onTabChange && onTabChange('Quote Engine')}
          className={`text-sm h-full flex items-center px-1 transition-colors ${
            activeTab === 'Quote Engine'
              ? 'font-bold text-black border-b-2 border-black'
              : 'font-semibold text-gray-700 hover:text-black'
          }`}
        >
          Quote Engine
        </button>
        <button
          onClick={() => onTabChange && onTabChange('Project Dashboard')}
          className={`text-sm h-full flex items-center px-1 transition-colors ${
            activeTab === 'Project Dashboard'
              ? 'font-bold text-black border-b-2 border-black'
              : 'font-medium text-gray-500 hover:text-gray-900'
          }`}
        >
          Project Dashboard
        </button>
        <button
          onClick={() => onTabChange && onTabChange('Archive')}
          className={`text-sm h-full flex items-center px-1 transition-colors ${
            activeTab === 'Archive'
              ? 'font-bold text-black border-b-2 border-black'
              : 'font-medium text-gray-500 hover:text-gray-900'
          }`}
        >
          Archive
        </button>
      </div>

      {/* Right Controls: Search, Cart Icon, Notifications, Help, Profile */}
      <div className="flex items-center gap-3">
        {/* Global Catalog Search */}
        <div className="relative w-36 sm:w-64 hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search Global catalog..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-colors"
          />
        </div>

        {/* Shopping Cart Button - ONLY trigger to open/close My Quote sidebar */}
        <button
          onClick={() => {
            onToggleSidebar?.();
          }}
          className={`relative p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
            isSidebarOpen
              ? 'bg-black text-white'
              : 'text-gray-700 hover:text-black hover:bg-gray-100'
          }`}
          title="My Quote"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {cartItemCount > 0 && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                isSidebarOpen ? 'bg-white text-black' : 'bg-black text-white'
              }`}
            >
              {cartItemCount}
            </span>
          )}
        </button>

        {/* Notifications */}
        <button className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors" title="Notifications">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Help */}
        <button className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors" title="Help">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3m.08 4h.01" />
          </svg>
        </button>

        {/* User Profile Avatar */}
        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            alt="Profile"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>
    </header>
  );
}
