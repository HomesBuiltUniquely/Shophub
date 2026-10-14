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

function ReferralsContent() {
  const { data, isLoading } = useClientDashboard();
  const profile = data.profile;

  const referralCode = `HUB${profile?.clientId?.replace(/\D/g, '') || '99903'}`;
  const referralLink = `https://hubinterior.com/refer?code=${referralCode}`;

  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                CLIENT REWARDS
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Project {profile?.clientId || 'BLR-QK-KJT5T5P7EF'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
              Refer & Earn Rewards
            </h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Invite friends and neighbors to design with HUB. Every referral pays more than the last. Earn up to ₹1,00,000.
            </p>
          </div>

          {/* Hero Rewards Card */}
          <div className="bg-gradient-to-r from-black via-zinc-900 to-black text-white rounded-[32px] p-8 sm:p-10 mb-8 shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-4">
              <span className="px-3 py-1 rounded-full bg-red-600/30 text-red-400 font-extrabold text-[11px] tracking-wider uppercase border border-red-500/40">
                EXCLUSIVE CLIENT BENEFIT
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Refer HUB. <br />Earn up to Rs 1 Lakh.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                Every referral pays more than the last. Share your exclusive referral code <strong>{referralCode}</strong> with friends and family. Five referrals add up to ₹1,00,000.
              </p>

              {/* Referral Code Box */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">
                      Your Referral Code
                    </div>
                    <div className="text-xl font-mono font-black text-white tracking-widest">
                      {referralCode}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="bg-white text-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-zinc-200 transition-colors"
                  >
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `Hey! I'm designing my home interior with HUB Interior Solutions. Use my referral code ${referralCode} to get up to ₹50,000 off on your custom interiors: ${referralLink}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  <span>Share via WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Friends Referred
              </div>
              <div className="text-2xl font-black text-gray-950 mt-2">
                0
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Share your link to get started
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Pending Verification
              </div>
              <div className="text-2xl font-black text-gray-950 mt-2">
                ₹0
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                Design review in progress
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04]">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Total Earned & Paid
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2">
                ₹0
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">
                Credited directly to your bank account
              </div>
            </div>
          </div>

          {/* 3 Steps Explainer */}
          <div className="bg-white rounded-[28px] p-8 shadow-sm border border-black/[0.04] mb-8">
            <h3 className="text-base font-extrabold text-gray-950 mb-4">
              How the Referral Program Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-gray-600">
              <div className="p-4 rounded-2xl bg-[#FAF7F2] space-y-2">
                <div className="w-8 h-8 rounded-full bg-black text-white font-black flex items-center justify-center text-xs">
                  1
                </div>
                <div className="font-extrabold text-gray-900 text-sm">Share Their Name & Number</div>
                <p>Share your personalized link or code with your apartment community, colleagues, or family. Four easy ways to refer in under a minute.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] space-y-2">
                <div className="w-8 h-8 rounded-full bg-black text-white font-black flex items-center justify-center text-xs">
                  2
                </div>
                <div className="font-extrabold text-gray-900 text-sm">They Get Design Consultation</div>
                <p>Your friend books a free showroom 3D consultation and starts their interior design journey with HUB.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] space-y-2">
                <div className="w-8 h-8 rounded-full bg-black text-white font-black flex items-center justify-center text-xs">
                  3
                </div>
                <div className="font-extrabold text-gray-900 text-sm">You Earn Increasing Rewards</div>
                <p>Each referral pays more: 1st ₹10,000 • 2nd ₹15,000 • 3rd ₹20,000 • 4th ₹25,000 • 5th+ ₹30,000. No limit on how many you refer!</p>
              </div>
            </div>
          </div>

          {/* Referral Visual Guide Section */}
          <div className="mb-8 space-y-4 max-w-4xl mx-auto">
            {/* Hero CTA Image */}
            <div className="rounded-[20px] overflow-hidden shadow-lg border border-black/[0.05] hover:shadow-xl transition-shadow duration-300">
              <img
                src="/images/referrals/refer-hub-cta.jpg"
                alt="Refer HUB and Earn up to Rs 1 Lakh"
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Two Column Layout for Other Images */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Four Ways to Refer */}
              <div className="rounded-[20px] overflow-hidden shadow-md border border-black/[0.05] hover:shadow-lg transition-shadow duration-300">
                <img
                  src="/images/referrals/four-ways-to-refer.jpg"
                  alt="Four ways to refer - Quick and easy referral methods"
                  className="w-full h-auto object-contain"
                />
              </div>

              {/* Rewards Chart */}
              <div className="rounded-[20px] overflow-hidden shadow-md border border-black/[0.05] hover:shadow-lg transition-shadow duration-300">
                <img
                  src="/images/referrals/referral-rewards-chart.jpg"
                  alt="Every referral pays more than the last - Rewards breakdown"
                  className="w-full h-auto object-contain"
                />
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

export default function ReferralsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientDashboardProvider>
        <ReferralsContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
