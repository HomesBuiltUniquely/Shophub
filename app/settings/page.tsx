'use client';

import { useEffect, useRef, useState } from 'react';
import EnterpriseShell from '@/components/layout/EnterpriseShell';
import SignOutButton from '@/components/auth/SignOutButton';
import { roleLabel, useCurrentUser } from '@/lib/auth/useCurrentUser';
import { EMPTY_PROFILE, readLocalProfile, writeLocalProfile, type ProfileLocal } from '@/lib/profile-local';

type GeneralSettings = {
  legalName: string;
  country: string;
  storeName: string;
  contactEmail: string;
  phone: string;
  address: string;
  currency: string;
  backupRegion: string;
  unitSystem: string;
  weightUnit: string;
  timezone: string;
  orderPrefix: string;
  orderSuffix: string;
};

const STORAGE_KEY = 'shophub_general_settings';

const DEFAULTS: GeneralSettings = {
  legalName: 'My Store - entity',
  country: 'India',
  storeName: 'My Store',
  contactEmail: '',
  phone: '',
  address: 'India',
  currency: 'INR',
  backupRegion: 'India',
  unitSystem: 'metric',
  weightUnit: 'kg',
  timezone: 'Asia/Kolkata',
  orderPrefix: '#',
  orderSuffix: '',
};

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-gray-500">{hint}</p> : null}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

function Row({
  icon,
  title,
  subtitle,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onClick?: () => void;
}) {
  const className =
    'w-full flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-3 text-left';
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} hover:bg-gray-100`}>
        <span className="text-gray-500">{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-gray-900">{title}</span>
          {subtitle ? <span className="block text-xs text-gray-500 truncate">{subtitle}</span> : null}
        </span>
        {action || (
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>
    );
  }
  return (
    <div className={className}>
      <span className="text-gray-500">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-gray-900">{title}</span>
        {subtitle ? <span className="block text-xs text-gray-500 truncate">{subtitle}</span> : null}
      </span>
      {action}
    </div>
  );
}

const fieldCls =
  'mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-black';
const labelCls = 'block text-[11px] font-semibold text-gray-600';

export default function SettingsPage() {
  const user = useCurrentUser();
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULTS);
  const [profile, setProfile] = useState<ProfileLocal>(EMPTY_PROFILE);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      setProfile(readLocalProfile());
    } catch {
      /* keep defaults */
    }
  }, []);

  useEffect(() => {
    if (!settings.contactEmail && user?.email) {
      setSettings((prev) => ({ ...prev, contactEmail: user.email }));
    }
    if (user?.name) {
      setProfile((prev) => (prev.displayName ? prev : { ...prev, displayName: user.name }));
    }
  }, [user?.email, user?.name, settings.contactEmail]);

  const update = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    writeLocalProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const updateProfile = <K extends keyof ProfileLocal>(key: K, value: ProfileLocal[K]) => {
    setProfile((prev) => {
      const next = { ...prev, [key]: value };
      writeLocalProfile(next);
      return next;
    });
    setSaved(false);
  };

  const uploadImage = async (kind: 'avatar' | 'cover', file?: File) => {
    if (!file) return;
    setUploading(kind);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'profile');
      const res = await fetch('/api/uploads', { method: 'POST', body, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      const key = kind === 'avatar' ? 'avatarUrl' : 'coverUrl';
      setProfile((prev) => {
        const next = { ...prev, [key]: data.url };
        writeLocalProfile(next);
        return next;
      });
      show(kind === 'avatar' ? 'Profile photo updated.' : 'Cover photo updated.');
    } catch (err: any) {
      show(err.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const show = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  const sampleOrder = `${settings.orderPrefix || ''}1001${settings.orderSuffix || ''}`;

  return (
    <EnterpriseShell title="Settings" placeholder="Search settings...">
      <main className="lg:ml-56 pt-16 p-4 sm:p-6 lg:p-8 max-w-4xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Settings</p>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">General</h1>
          </div>
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>

        {notice && (
          <p className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700">
            {notice}
          </p>
        )}

        <div className="space-y-5">
          <Card title="Profile" hint="Photo, cover, and public details for this workspace account.">
            <input
              ref={coverRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                uploadImage('cover', e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <input
              ref={avatarRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                uploadImage('avatar', e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            <div className="relative pb-8">
              <div className="relative h-36 overflow-hidden rounded-xl bg-gray-100">
                {profile.coverUrl ? (
                  <img src={profile.coverUrl} alt="Cover" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold text-gray-500">
                    {uploading === 'cover' ? 'Uploading cover…' : 'No cover photo yet'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  className="absolute right-3 top-3 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-gray-800 shadow-sm hover:bg-white"
                >
                  {profile.coverUrl ? 'Change cover' : 'Upload cover'}
                </button>
              </div>

              <div className="absolute left-5 top-[7.25rem] flex items-end gap-4">
                <button
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  className="relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-md"
                >
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-lg font-bold text-gray-600">
                      {(profile.displayName || user?.name || 'U').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">
                    {uploading === 'avatar' ? '…' : 'Edit'}
                  </span>
                </button>
                <div className="mb-1">
                  <p className="text-sm font-bold text-gray-900">
                    {profile.displayName || user?.name || 'Your name'}
                  </p>
                  <p className="text-xs text-gray-500">{profile.title || roleLabel(user) || 'Add a title'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
              >
                {uploading === 'avatar' ? 'Uploading…' : 'Upload profile photo'}
              </button>
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
              >
                {uploading === 'cover' ? 'Uploading…' : 'Upload cover'}
              </button>
              {profile.avatarUrl && (
                <button type="button" onClick={() => updateProfile('avatarUrl', '')} className="text-xs font-semibold text-red-600">
                  Remove photo
                </button>
              )}
              {profile.coverUrl && (
                <button type="button" onClick={() => updateProfile('coverUrl', '')} className="text-xs font-semibold text-red-600">
                  Remove cover
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Signed in as</p>
                <p className="truncate text-sm font-medium text-gray-900">{user?.name || '—'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Email</p>
                <p className="truncate text-sm font-medium text-gray-900">{user?.email || '—'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Role</p>
                <p className="text-sm font-medium text-gray-900">{roleLabel(user) || '—'}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>
                Display name
                <input
                  className={fieldCls}
                  value={profile.displayName}
                  placeholder={user?.name || 'Your name'}
                  onChange={(e) => updateProfile('displayName', e.target.value)}
                />
              </label>
              <label className={labelCls}>
                Title
                <input
                  className={fieldCls}
                  value={profile.title}
                  placeholder="Catalog manager"
                  onChange={(e) => updateProfile('title', e.target.value)}
                />
              </label>
              <label className={labelCls}>
                Phone
                <input
                  className={fieldCls}
                  value={profile.phone}
                  placeholder="+91 00000 00000"
                  onChange={(e) => updateProfile('phone', e.target.value)}
                />
              </label>
              <label className={labelCls}>
                Location
                <input
                  className={fieldCls}
                  value={profile.location}
                  placeholder="Bengaluru, India"
                  onChange={(e) => updateProfile('location', e.target.value)}
                />
              </label>
              <label className={`${labelCls} sm:col-span-2`}>
                Website
                <input
                  className={fieldCls}
                  value={profile.website}
                  placeholder="https://"
                  onChange={(e) => updateProfile('website', e.target.value)}
                />
              </label>
              <label className={`${labelCls} sm:col-span-2`}>
                Bio
                <textarea
                  rows={3}
                  className={fieldCls}
                  value={profile.bio}
                  placeholder="A short intro shown on your workspace profile."
                  onChange={(e) => updateProfile('bio', e.target.value)}
                />
              </label>
            </div>
            <div className="mt-4">
              <SignOutButton className="inline-flex rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50" />
            </div>
          </Card>

          <Card title="Business details" hint="Business entity used for financial products, markets, apps, and taxes in this workspace.">
            <Row
              icon={<span className="text-base">🇮🇳</span>}
              title={settings.legalName || 'Business entity'}
              subtitle={settings.country}
              onClick={() => show('Business entity details')}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>
                Legal / entity name
                <input className={fieldCls} value={settings.legalName} onChange={(e) => update('legalName', e.target.value)} />
              </label>
              <label className={labelCls}>
                Country
                <input className={fieldCls} value={settings.country} onChange={(e) => update('country', e.target.value)} />
              </label>
            </div>
          </Card>

          <Card title="Store contact details">
            <div className="space-y-2">
              <Row
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                title={settings.storeName || 'Store name'}
                subtitle={`${settings.contactEmail || 'No email'} · ${settings.phone || 'No phone number'}`}
              />
              <Row
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
                title="Store address"
                subtitle={settings.address || 'Add an address'}
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>
                Store name
                <input className={fieldCls} value={settings.storeName} onChange={(e) => update('storeName', e.target.value)} />
              </label>
              <label className={labelCls}>
                Contact email
                <input className={fieldCls} value={settings.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
              </label>
              <label className={labelCls}>
                Phone
                <input className={fieldCls} value={settings.phone} onChange={(e) => update('phone', e.target.value)} placeholder="No phone number" />
              </label>
              <label className={labelCls}>
                Store address
                <input className={fieldCls} value={settings.address} onChange={(e) => update('address', e.target.value)} />
              </label>
            </div>
          </Card>

          <Card title="Store defaults">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>
                Currency display
                <select className={fieldCls} value={settings.currency} onChange={(e) => update('currency', e.target.value)}>
                  <option value="INR">Indian Rupee (INR ₹)</option>
                  <option value="USD">US Dollar (USD $)</option>
                  <option value="EUR">Euro (EUR €)</option>
                  <option value="GBP">British Pound (GBP £)</option>
                  <option value="AED">UAE Dirham (AED)</option>
                </select>
              </label>
              <label className={labelCls}>
                Backup region
                <select className={fieldCls} value={settings.backupRegion} onChange={(e) => update('backupRegion', e.target.value)}>
                  <option>India</option>
                  <option>United Arab Emirates</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Singapore</option>
                </select>
              </label>
              <label className={labelCls}>
                Unit system
                <select className={fieldCls} value={settings.unitSystem} onChange={(e) => update('unitSystem', e.target.value)}>
                  <option value="metric">Metric system</option>
                  <option value="imperial">Imperial system</option>
                </select>
              </label>
              <label className={labelCls}>
                Default weight unit
                <select className={fieldCls} value={settings.weightUnit} onChange={(e) => update('weightUnit', e.target.value)}>
                  <option value="kg">Kilogram (kg)</option>
                  <option value="g">Gram (g)</option>
                  <option value="lb">Pound (lb)</option>
                  <option value="oz">Ounce (oz)</option>
                </select>
              </label>
              <label className={`${labelCls} sm:col-span-2`}>
                Time zone
                <select className={fieldCls} value={settings.timezone} onChange={(e) => update('timezone', e.target.value)}>
                  <option value="Asia/Kolkata">(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi</option>
                  <option value="Asia/Dubai">(GMT+04:00) Abu Dhabi, Muscat</option>
                  <option value="Europe/London">(GMT+00:00) London</option>
                  <option value="America/New_York">(GMT-05:00) Eastern Time</option>
                  <option value="Asia/Singapore">(GMT+08:00) Singapore</option>
                </select>
              </label>
            </div>
            <p className="mt-3 text-xs text-gray-400">Sets the time for when orders and analytics are recorded.</p>
          </Card>

          <Card title="Order ID format" hint="Shown on the order page, customer pages, and customer order notifications to identify orders.">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>
                Prefix
                <input className={fieldCls} value={settings.orderPrefix} onChange={(e) => update('orderPrefix', e.target.value)} />
              </label>
              <label className={labelCls}>
                Suffix
                <input className={fieldCls} value={settings.orderSuffix} onChange={(e) => update('orderSuffix', e.target.value)} />
              </label>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Your order ID will appear as {sampleOrder}, {settings.orderPrefix}1002{settings.orderSuffix}, {settings.orderPrefix}1003{settings.orderSuffix}, …
            </p>
          </Card>
        </div>
      </main>
    </EnterpriseShell>
  );
}
