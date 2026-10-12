'use client';

import React, { Suspense, useState } from 'react';
import {
  ClientDashboardProvider,
  useClientDashboard,
} from '@/lib/client/ClientDashboardContext';
import ClientSidebar from '@/components/client/layout/ClientSidebar';
import ClientHeader from '@/components/client/layout/ClientHeader';
import ClientFooter from '@/components/client/layout/ClientFooter';
import ContactRmModal from '@/components/client/dashboard/ContactRmModal';
import FloatingSupportChat from '@/components/client/dashboard/FloatingSupportChat';

function SettingsContent() {
  const { data, isLoading } = useClientDashboard();
  const profile = data.profile;
  const team = data.team;

  const [name, setName] = useState(profile?.name || 'Client S');
  const [phone, setPhone] = useState(profile?.phone || '9876523951');
  const [email] = useState(profile?.email || 'go@hubinterior.com');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [notifications, setNotifications] = useState({
    milestones: true,
    whatsapp: true,
    quotes: true,
    promotions: false,
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      <ClientSidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <ClientHeader />

        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-[0.18em]">
                ACCOUNT PREFERENCES
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                {profile?.clientId || 'BLR-QK-KJT5T5P7EF'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Profile & Project Settings
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Manage your personal details, site delivery address, and notification preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
            {/* Left 7 Columns: Personal Profile Details Form */}
            <div className="lg:col-span-7 bg-white rounded-[28px] p-6 sm:p-8 shadow-sm border border-black/[0.04] space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-xl font-black">
                  {name.charAt(0) || 'C'}
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-950">{name}</h2>
                  <div className="text-xs text-gray-500 font-mono">
                    Client ID: {profile?.clientId || 'BLR-QK-KJT5T5P7EF'}
                  </div>
                  <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                    Premium Member
                  </div>
                </div>
              </div>

              {savedSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                  ✓ Profile settings updated successfully!
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-black outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Registered Email (Read-only)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full p-3.5 rounded-xl border border-gray-200 text-xs bg-gray-50 text-gray-500 font-mono outline-none cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Primary Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-black outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <h3 className="text-sm font-extrabold text-gray-950 mb-3">
                    Project Site Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        Property / Society
                      </label>
                      <input
                        type="text"
                        disabled
                        value="Purva Palm Beach"
                        className="w-full p-3.5 rounded-xl border border-gray-200 text-xs bg-gray-50 text-gray-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        Configuration
                      </label>
                      <input
                        type="text"
                        disabled
                        value={profile?.propertyType || '3 BHK Apartment'}
                        className="w-full p-3.5 rounded-xl border border-gray-200 text-xs bg-gray-50 text-gray-700 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="bg-black hover:bg-zinc-800 text-white font-bold py-3 px-6 rounded-full text-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            {/* Right 5 Columns: Notification & Team Controls */}
            <div className="lg:col-span-5 space-y-6">
              {/* Notifications Card */}
              <div className="bg-white rounded-[28px] p-6 shadow-sm border border-black/[0.04] space-y-4">
                <h3 className="text-base font-extrabold text-gray-950">
                  Communication & Alerts
                </h3>
                <p className="text-xs text-gray-500">
                  Choose how you want to receive project status updates and milestone receipts.
                </p>

                <div className="space-y-3 pt-2 text-xs">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF7F2] cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Milestone Payment Receipts</div>
                      <div className="text-[11px] text-gray-500">Instant SMS & Email when payments clear</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.milestones}
                      onChange={(e) => setNotifications({ ...notifications, milestones: e.target.checked })}
                      className="w-4 h-4 accent-black rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF7F2] cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">WhatsApp Project Dispatch Updates</div>
                      <div className="text-[11px] text-gray-500">Direct notifications from site engineers</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.whatsapp}
                      onChange={(e) => setNotifications({ ...notifications, whatsapp: e.target.checked })}
                      className="w-4 h-4 accent-black rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF7F2] cursor-pointer">
                    <div>
                      <div className="font-bold text-gray-900">Quotation Revisions</div>
                      <div className="text-[11px] text-gray-500">Alerts when Designer updates 3D designs</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications.quotes}
                      onChange={(e) => setNotifications({ ...notifications, quotes: e.target.checked })}
                      className="w-4 h-4 accent-black rounded"
                    />
                  </label>
                </div>
              </div>

              {/* Assigned RM Help Card */}
              <div className="bg-[#FAF7F2] rounded-[28px] p-6 border border-[#EAE5DA] space-y-3 text-xs">
                <div className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">
                  NEED TO TRANSFER OWNERSHIP OR UPDATE PROPERTY?
                </div>
                <h4 className="font-black text-gray-950 text-sm">
                  Contact Relationship Manager {team?.relationshipManager?.name || 'Sharanya'}
                </h4>
                <p className="text-gray-600 leading-relaxed">
                  To modify delivery addresses, add co-owners, or adjust contract clauses, please reach out to your relationship manager directly.
                </p>
                <div className="pt-1">
                  <a
                    href={`tel:${team?.relationshipManager?.phone || '+918755009932'}`}
                    className="font-bold text-black hover:underline"
                  >
                    Call {team?.relationshipManager?.phone || '+91 87550 09932'} →
                  </a>
                </div>
              </div>
            </div>
          </div>

          <ClientFooter />
        </main>

        <FloatingSupportChat />
        <ContactRmModal />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientDashboardProvider>
        <SettingsContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
