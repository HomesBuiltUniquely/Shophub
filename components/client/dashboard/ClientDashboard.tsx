'use client';

import React, { Suspense } from 'react';
import { ClientDashboardProvider } from '@/lib/client/ClientDashboardContext';
import ClientSidebar from '../layout/ClientSidebar';
import ClientHeader from '../layout/ClientHeader';
import ClientFooter from '../layout/ClientFooter';
import WelcomeSection from './WelcomeSection';
import MetricsGrid from './MetricsGrid';
import ProjectJourney from './ProjectJourney';
import UpcomingActions from './UpcomingActions';
import QuickActionCards from './QuickActionCards';
import FloatingSupportChat from './FloatingSupportChat';
import ContactRmModal from './ContactRmModal';

function DashboardContent() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      {/* Client Sidebar */}
      <ClientSidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Sticky Top Header */}
        <ClientHeader />

        {/* Dashboard Main Body */}
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 max-w-[1440px] w-full mx-auto">
          {/* Greeting */}
          <WelcomeSection />

          {/* Top 4 Metrics Cards */}
          <MetricsGrid />

          {/* Project Journey Stepper */}
          <ProjectJourney />

          {/* Bottom Grid: 3 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
            {/* Column 1: Upcoming Actions */}
            <div>
              <UpcomingActions />
            </div>

            {/* Columns 2 & 3: Action Cards */}
            <QuickActionCards />
          </div>

          {/* Footer */}
          <ClientFooter />
        </main>

        {/* Floating Support Chat Button */}
        <FloatingSupportChat />

        {/* Contact RM Dialog */}
        <ContactRmModal />
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
            <span className="text-sm font-semibold text-gray-500">Loading your project portal...</span>
          </div>
        </div>
      }
    >
      <ClientDashboardProvider>
        <DashboardContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
