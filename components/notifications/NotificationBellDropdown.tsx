'use client';

import React, { useState, useEffect, useRef } from 'react';
import { playNotificationChime } from '@/lib/utils/notification-sound';
import {
  NotificationCategory,
  NotificationItem,
  NotificationResponseData,
  NotificationRoleFilter,
} from '@/lib/types/notification.types';

interface NotificationBellDropdownProps {
  className?: string;
  buttonClassName?: string;
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const ROLE_TABS: { key: NotificationRoleFilter; label: string; color: string; bg: string; dot: string }[] = [
  { key: 'all',        label: 'All Roles',  color: 'text-gray-600',    bg: 'bg-gray-100',    dot: 'bg-gray-400' },
  { key: 'admin',      label: 'Admin',      color: 'text-violet-700',  bg: 'bg-violet-100',  dot: 'bg-violet-500' },
  { key: 'enterprise', label: 'Enterprise', color: 'text-blue-700',    bg: 'bg-blue-100',    dot: 'bg-blue-500' },
  { key: 'client',     label: 'Client',     color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
];

// Role → accent colours used on notification item tag pills
const ROLE_TAG_STYLE: Record<NotificationRoleFilter, { pill: string; dot: string }> = {
  all:        { pill: 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]', dot: 'bg-rose-500' },
  admin:      { pill: 'bg-violet-50 text-violet-700 border-violet-200',  dot: 'bg-violet-500' },
  enterprise: { pill: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-500' },
  client:     { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
};

export default function NotificationBellDropdown({
  className = '',
  buttonClassName = '',
}: NotificationBellDropdownProps) {
  const [isOpen, setIsOpen]                     = useState(false);
  const [soundEnabled, setSoundEnabled]         = useState(true);
  const [selectedRole, setSelectedRole]         = useState<NotificationRoleFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all');
  const [data, setData]                         = useState<NotificationResponseData | null>(null);
  const [isLoading, setIsLoading]               = useState(false);
  const [isRefreshing, setIsRefreshing]         = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Persist sound preference
  useEffect(() => {
    const saved = localStorage.getItem('shophub_notification_sound');
    if (saved !== null) setSoundEnabled(saved === 'true');
  }, []);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('shophub_notification_sound', String(next));
    if (next) playNotificationChime();
  };

  // Fetch whenever either filter changes
  const fetchNotifications = async (
    role: NotificationRoleFilter = selectedRole,
    category: NotificationCategory = selectedCategory,
  ) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/notifications?category=${category}&roleFilter=${role}`);
      if (res.ok) {
        const json: NotificationResponseData = await res.json();
        setData(json);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(selectedRole, selectedCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, selectedCategory]);

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [isOpen]);

  const handleBellClick = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && soundEnabled) playNotificationChime();
  };

  // Mark all as read
  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      if (data) {
        setData({
          ...data,
          unreadTotal: 0,
          categoryCounts: { all: 0, leads: 0, milestones: 0, payments: 0, meetings: 0, products: 0 },
          roleCounts: { admin: 0, enterprise: 0, client: 0 },
          notifications: data.notifications.map((n) => ({ ...n, isRead: true })),
        });
      }
    } catch (err) {
      console.warn('Failed to mark all read', err);
    }
  };

  // Mark single as read
  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read', id: item.id }),
        });
        if (data) {
          const roleCounts = { ...data.roleCounts };
          const categoryCounts = { ...data.categoryCounts };
          if (item.userRole !== 'all' && roleCounts[item.userRole] > 0) {
            roleCounts[item.userRole] -= 1;
          }
          if (item.category !== 'all' && categoryCounts[item.category] > 0) {
            categoryCounts[item.category] -= 1;
          }
          categoryCounts.all = Math.max(0, categoryCounts.all - 1);
          setData({
            ...data,
            unreadTotal: categoryCounts.all,
            categoryCounts,
            roleCounts,
            notifications: data.notifications.map((n) =>
              n.id === item.id ? { ...n, isRead: true } : n,
            ),
          });
        }
      } catch (err) {
        console.warn('Failed to mark item read', err);
      }
    }
  };

  // Manual refresh
  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await fetchNotifications(selectedRole, selectedCategory);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Sort: unread first, then read — within each bucket preserve original order.
  // When an item is marked read it will animate to the bottom of its section.
  const sortedNotifications = [...(data?.notifications || [])].sort((a, b) => {
    if (a.isRead === b.isRead) return 0;
    return a.isRead ? 1 : -1; // unread (false) < read (true) → unread floats up
  });

  // Group by section label after sorting so read items end up at the bottom
  // of each section naturally.
  const groupedNotifications = sortedNotifications.reduce(
    (acc: Record<string, NotificationItem[]>, item) => {
      const s = item.section || 'OLDER';
      if (!acc[s]) acc[s] = [];
      acc[s].push(item);
      return acc;
    },
    {},
  );

  const unreadCount = data?.unreadTotal ?? 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* ── Bell Button ── */}
      <button
        type="button"
        onClick={handleBellClick}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className={`relative p-2 text-gray-700 hover:text-black hover:bg-gray-100 rounded-xl border border-gray-200 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-black/10 ${buttonClassName} ${
          isOpen ? 'bg-gray-100 ring-2 ring-black/10' : 'bg-white'
        }`}
        title="Notifications"
      >
        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-black text-white text-[10px] font-bold rounded-full ring-2 ring-white flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Popover ── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[400px] sm:w-[440px] bg-white rounded-2xl shadow-2xl border border-gray-200/90 z-50 overflow-hidden text-left font-sans select-none">

          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-gray-950 tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-black text-white text-[11px] font-bold px-2 py-0.5 rounded-full tracking-wide">
                  {unreadCount > 99 ? '99+' : unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              {/* Mark all read */}
              <button
                type="button" onClick={handleMarkAllRead}
                className="p-1.5 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Mark all as read"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              {/* Sound */}
              <button
                type="button" onClick={toggleSound}
                className={`p-1.5 rounded-lg transition-colors ${
                  soundEnabled ? 'text-gray-700 hover:text-gray-950 hover:bg-gray-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                }`}
                title={soundEnabled ? 'Sound on – click to mute' : 'Sound off – click to enable'}
              >
                {soundEnabled ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.586 15H2V9h3.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l4-4m0 4l-4-4" />
                  </svg>
                )}
              </button>
              {/* Refresh */}
              <button
                type="button" onClick={handleRefresh}
                className="p-1.5 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <svg className={`w-4 h-4 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Role segregation tabs ── */}
          <div className="px-5 pt-2 pb-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar bg-gray-50/40 border-b border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0 mr-1">Role</span>
            {ROLE_TABS.map(({ key, label, color, bg, dot }) => {
              const count =
                key === 'all'
                  ? unreadCount
                  : (data?.roleCounts[key as Exclude<NotificationRoleFilter, 'all'>] ?? 0);
              const active = selectedRole === key;
              return (
                <button
                  key={key} type="button"
                  onClick={() => setSelectedRole(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    active
                      ? `${bg} ${color} border-current shadow-xs font-bold`
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  {/* Coloured dot indicator */}
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? dot : 'bg-gray-300'}`} />
                  {label}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 rounded-full leading-tight ${active ? 'bg-white/70' : 'bg-gray-100'} ${color}`}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
            <span className="h-5 w-px bg-gray-200 shrink-0" />
            <button
              type="button"
              aria-pressed={selectedCategory === 'products'}
              onClick={() => setSelectedCategory(selectedCategory === 'products' ? 'all' : 'products')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === 'products'
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs font-bold'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              Products
              {(data?.categoryCounts.products ?? 0) > 0 && (
                <span className={`text-[10px] font-bold px-1.5 rounded-full leading-tight ${selectedCategory === 'products' ? 'bg-white/70' : 'bg-gray-100'} text-blue-700`}>
                  {(data?.categoryCounts.products ?? 0) > 99 ? '99+' : data?.categoryCounts.products}
                </span>
              )}
            </button>
          </div>

          {/* ── Notification list ── */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100/80">
            {isLoading && !data && (
              <div className="p-8 text-center text-xs text-gray-400">Loading notifications…</div>
            )}

            {!isLoading && (!data?.notifications || data.notifications.length === 0) && (
              <div className="p-8 text-center">
                <p className="text-xs text-gray-400">No notifications found</p>
                {(selectedRole !== 'all' || selectedCategory !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('all');
                      setSelectedCategory('all');
                    }}
                    className="mt-2 text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}

            {Object.entries(groupedNotifications).map(([sectionTitle, items]) => (
              <div key={sectionTitle}>
                <div className="px-5 pt-3 pb-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  {sectionTitle}
                </div>

                {items.map((item) => {
                  const tagStyle = ROLE_TAG_STYLE[item.userRole] ?? ROLE_TAG_STYLE.all;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={`px-5 py-3 hover:bg-gray-50/90 transition-colors cursor-pointer flex items-start gap-3.5 group ${
                        item.isRead ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Icon circle — colour matches role */}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                          item.userRole === 'admin'
                            ? 'bg-violet-100 text-violet-600'
                            : item.userRole === 'enterprise'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-gray-900 group-hover:text-black leading-snug">
                            {item.title}
                          </h4>
                          <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap shrink-0">
                            {item.timeAgo}
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {item.subtitle}
                        </p>

                        <div className="mt-2 flex items-center justify-between">
                          {/* Role-coloured tag pill */}
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border ${tagStyle.pill}`}>
                            {item.tag}
                          </span>

                          <div className="flex items-center gap-2">
                            {!item.isRead && (
                              <span className={`w-1.5 h-1.5 rounded-full ${tagStyle.dot}`} />
                            )}
                            <svg
                              className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-transform group-hover:translate-x-0.5"
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-3 bg-white border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-gray-900 hover:text-black hover:underline transition-colors"
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
