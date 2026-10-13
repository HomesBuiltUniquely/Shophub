'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import {
  ClientDashboardProvider,
  useClientDashboard,
} from '@/lib/client/ClientDashboardContext';
import ClientSidebar from '@/components/client/layout/ClientSidebar';
import ClientHeader from '@/components/client/layout/ClientHeader';
import ClientFooter from '@/components/client/layout/ClientFooter';
import ContactRmModal from '@/components/client/dashboard/ContactRmModal';
import FloatingSupportChat from '@/components/client/dashboard/FloatingSupportChat';
import {
  CLIENT_PROFILE_UPDATED_EVENT,
  EMPTY_CLIENT_PROFILE,
  type ClientSavedProfile,
} from '@/lib/client/client-profile';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

const fieldCls =
  'mt-1.5 w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/20';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500';

function SettingsContent() {
  const user = useCurrentUser();
  const { data } = useClientDashboard();
  const [profile, setProfile] = useState<ClientSavedProfile>(EMPTY_CLIENT_PROFILE);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | 'gallery' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/client/profile', { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json?.profile) return;
        setProfile({
          ...EMPTY_CLIENT_PROFILE,
          displayName: data.profile.name,
          phone: data.profile.phone || '',
          location: data.profile.propertyDetails || '',
          propertyType: data.profile.propertyType || '',
          email: user?.email || data.profile.email || '',
          ...json.profile,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setProfile({
            ...EMPTY_CLIENT_PROFILE,
            displayName: data.profile.name,
            phone: data.profile.phone || '',
            location: data.profile.propertyDetails || '',
            propertyType: data.profile.propertyType || '',
            email: user?.email || data.profile.email || '',
            avatarUrl: data.profile.avatarUrl || '',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [data.profile, user?.email]);

  const show = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  const persist = async (next: ClientSavedProfile) => {
    setSaving(true);
    try {
      const res = await fetch('/api/client/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(next),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save profile');
      setProfile(json.profile || next);
      window.dispatchEvent(new Event(CLIENT_PROFILE_UPDATED_EVENT));
      show('Profile saved.');
    } catch (err: unknown) {
      show((err as Error).message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (kind: 'avatar' | 'cover' | 'gallery', files?: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(kind);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'profile');
      const res = await fetch('/api/uploads', { method: 'POST', body, credentials: 'include' });
      const dataJson = await res.json();
      if (!res.ok) throw new Error(dataJson.error || 'Upload failed');
      const next =
        kind === 'gallery'
          ? { ...profile, gallery: [...(profile.gallery || []), dataJson.url] }
          : kind === 'avatar'
            ? { ...profile, avatarUrl: dataJson.url }
            : { ...profile, coverUrl: dataJson.url };
      setProfile(next);
      await persist(next);
    } catch (err: unknown) {
      show((err as Error).message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const removeGallery = (url: string) => {
    const next = { ...profile, gallery: (profile.gallery || []).filter((item) => item !== url) };
    setProfile(next);
    persist(next);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      <ClientSidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <ClientHeader pageTitle="My Hub" searchPlaceholder="Search profile..." />

        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
                Profile & Settings
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                Update your details and photos. These appear on your client portal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => persist(profile)}
              className="inline-flex items-center bg-black hover:bg-zinc-800 text-white text-xs font-bold py-2.5 px-5 rounded-full"
            >
              {saving ? 'Saving…' : 'Save details'}
            </button>
          </div>

          {notice && (
            <div className="bg-gray-950 text-white px-5 py-3 rounded-2xl text-xs font-semibold w-fit">
              {notice}
            </div>
          )}

          <section className="bg-white rounded-[28px] p-6 sm:p-7 border border-black/[0.04] shadow-sm">
            <input
              ref={coverRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                uploadImage('cover', e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={avatarRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                uploadImage('avatar', e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => {
                uploadImage('gallery', e.target.files);
                e.target.value = '';
              }}
            />

            <div className="relative pb-10">
              <div className="relative h-40 overflow-hidden rounded-[24px] bg-[#FAF7F2]">
                {profile.coverUrl ? (
                  <img src={profile.coverUrl} alt="Cover" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold text-gray-500">
                    {uploading === 'cover' ? 'Uploading cover…' : 'Add a cover photo'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-gray-800"
                >
                  {profile.coverUrl ? 'Change cover' : 'Upload cover'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                className="absolute left-6 top-[7.5rem] h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-[#EFEBE3] shadow-md"
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-lg font-bold text-gray-600">
                    {(profile.displayName || user?.name || 'U').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <button
                type="button"
                onClick={() => avatarRef.current?.click()}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-800"
              >
                {uploading === 'avatar' ? 'Uploading…' : 'Upload profile photo'}
              </button>
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-800"
              >
                {uploading === 'cover' ? 'Uploading…' : 'Upload cover'}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelCls}>
                Full name
                <input
                  className={fieldCls}
                  value={profile.displayName}
                  onChange={(e) => setProfile((prev) => ({ ...prev, displayName: e.target.value }))}
                />
              </label>
              <label className={labelCls}>
                Email
                <input className={fieldCls} value={profile.email || user?.email || ''} readOnly />
              </label>
              <label className={labelCls}>
                Phone
                <input
                  className={fieldCls}
                  value={profile.phone}
                  placeholder="+91 00000 00000"
                  onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </label>
              <label className={labelCls}>
                Property type
                <input
                  className={fieldCls}
                  value={profile.propertyType}
                  placeholder="2 BHK Apartment"
                  onChange={(e) => setProfile((prev) => ({ ...prev, propertyType: e.target.value }))}
                />
              </label>
              <label className={`${labelCls} sm:col-span-2`}>
                Location / property
                <input
                  className={fieldCls}
                  value={profile.location}
                  placeholder="Bangalore • 560076"
                  onChange={(e) => setProfile((prev) => ({ ...prev, location: e.target.value }))}
                />
              </label>
              <label className={`${labelCls} sm:col-span-2`}>
                About you
                <textarea
                  rows={3}
                  className={fieldCls}
                  value={profile.bio}
                  placeholder="A short note for your designer and RM."
                  onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
                />
              </label>
            </div>
          </section>

          <section className="bg-white rounded-[28px] p-6 sm:p-7 border border-black/[0.04] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.18em] text-gray-900">Photos</h2>
                <p className="text-sm text-gray-500 mt-1">Add extra images of you or your home.</p>
              </div>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="rounded-full bg-black text-white text-xs font-bold px-4 py-2"
              >
                {uploading === 'gallery' ? 'Uploading…' : 'Add photo'}
              </button>
            </div>
            {(profile.gallery || []).length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No extra photos yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {profile.gallery.map((url) => (
                  <div key={url} className="relative aspect-square overflow-hidden rounded-2xl bg-[#FAF7F2]">
                    <img src={url} alt="Uploaded" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGallery(url)}
                      className="absolute right-2 top-2 rounded-full bg-black/70 text-white text-[10px] font-bold px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <ClientFooter />
      </div>
      <ContactRmModal />
      <FloatingSupportChat />
    </div>
  );
}

export default function ClientSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-500">Loading profile...</span>
        </div>
      }
    >
      <ClientDashboardProvider>
        <SettingsContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
