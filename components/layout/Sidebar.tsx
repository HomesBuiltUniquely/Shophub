'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isInternalStaff } from '@/lib/auth/session';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';
import HubLogo from '@/components/brand/HubLogo';

const menuItems = [
  { name: 'DASHBOARD', href: '/dashboard', icon: 'dashboard' },
  { name: 'MASTER CATALOG', href: '/offerings', icon: 'list' },
  { name: 'QUOTE ENGINE', href: '/quote-engine', icon: 'quote' },
  { name: 'OFFERING INVOICE', href: '/offering-invoice', icon: 'invoice' },
  { name: 'BRANDS', href: '/brands', icon: 'brand' },
  { name: 'CATEGORIES', href: '/categories', icon: 'category' },
  { name: 'IMPORT', href: '/import', icon: 'upload' },
  { name: 'SETTINGS', href: '/settings', icon: 'settings' },
];

const INTERNAL_HREFS = new Set(['/offerings', '/quote-engine', '/offering-invoice']);

export default function Sidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const visibleItems = isInternalStaff(user)
    ? menuItems.filter((item) => INTERNAL_HREFS.has(item.href))
    : menuItems;

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      {/* Logo/Brand */}
      <Link href="/offerings" className="px-4 py-6 bg-white block border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <HubLogo height={26} />
        <div className="text-gray-400 text-[10px] uppercase tracking-wide mt-1.5">Enterprise Edition</div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 p-3 pt-4">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
            const isCreateOffering = pathname.startsWith('/offerings/CreateOfferings');
            const isActive =
              item.href === '/offerings'
                ? !isCreateOffering &&
                  (pathname === '/offerings' ||
                    pathname.startsWith('/offerings/') ||
                    pathname === '/enterprise/offerings')
                : item.href === '/quote-engine'
                  ? pathname.startsWith('/quote-engine') || pathname.startsWith('/quote-making')
                  : item.href === '/offering-invoice'
                    ? pathname.startsWith('/offering-invoice')
                    : pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium tracking-wide transition-colors ${
                    isActive
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.icon === 'dashboard' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth={2}/>
                      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth={2}/>
                      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth={2}/>
                      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth={2}/>
                    </svg>
                  )}
                  {item.icon === 'list' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                  {item.icon === 'quote' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )}
                  {item.icon === 'invoice' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {item.icon === 'brand' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" strokeWidth={2} />
                    </svg>
                  )}
                  {item.icon === 'category' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  )}
                  {item.icon === 'upload' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                  {item.icon === 'settings' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
