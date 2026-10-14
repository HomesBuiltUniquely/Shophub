'use client';

import React, { Suspense, useEffect, useState } from 'react';
import {
  ClientDashboardProvider,
  useClientDashboard,
} from '@/lib/client/ClientDashboardContext';
import ClientSidebar from '@/components/client/layout/ClientSidebar';
import ClientHeader from '@/components/client/layout/ClientHeader';
import ClientFooter from '@/components/client/layout/ClientFooter';
import CurrentPhaseCard from '@/components/client/project/CurrentPhaseCard';
import ExecutionReadinessCard from '@/components/client/project/ExecutionReadinessCard';
import NextBigStepCard from '@/components/client/project/NextBigStepCard';
import TimelineMilestonesCard from '@/components/client/project/TimelineMilestonesCard';
import ProjectTeamCard from '@/components/client/project/ProjectTeamCard';
import LatestRevisionCard from '@/components/client/project/LatestRevisionCard';
import SitePhotoGalleryModal from '@/components/client/project/SitePhotoGalleryModal';
import ContactRmModal from '@/components/client/dashboard/ContactRmModal';
import FloatingSupportChat from '@/components/client/dashboard/FloatingSupportChat';
import { ProjectPageData } from '@/lib/client/types';

function MyProjectContent() {
  const { data: dashboardData, openContactModal } = useClientDashboard();
  const [projectData, setProjectData] = useState<ProjectPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchProject = async () => {
      try {
        const endpoint = dashboardData?.profile?.leadId
          ? `/api/client/project?leadId=${encodeURIComponent(dashboardData.profile.leadId)}`
          : `/api/client/project`;
        const res = await fetch(endpoint);
        const json = await res.json();
        if (!cancelled && json?.success && json?.data) {
          setProjectData(json.data);
        }
      } catch (err) {
        console.warn('Could not fetch dynamic project data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProject();
    return () => {
      cancelled = true;
    };
  }, [dashboardData?.profile?.leadId]);

  // Fallback defaults matching screenshot exactly
  const phaseTitle = projectData?.currentPhaseTitle || dashboardData?.metrics?.find((m) => m.type === 'stage')?.value || 'Project in progress';
  const progress = projectData?.overallProgressPercentage ?? dashboardData?.metrics?.find((m) => m.type === 'completion')?.percentage ?? 0;
  const sitePhotos = projectData?.sitePhotos || [];
  const readiness = projectData?.readinessItems || [];
  const nextBigStep = projectData?.nextBigStep || {
    title: phaseTitle,
    startDate: 'In progress',
  };
  const milestones = projectData?.timelineMilestones || [];
  const team = projectData?.teamContacts || [];
  const revision = projectData?.latestRevision || {
    fileName: 'Project_Final_V4.pdf',
    fileSize: '12.4 MB',
    updatedText: 'Updated yesterday • 12.4 MB',
    downloadUrl: '#',
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      {/* Client Sidebar */}
      <ClientSidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        {/* Sticky Top Header */}
        <ClientHeader />

        {/* Dashboard Main Body */}
        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto space-y-7">
          {/* Row 1: Execution & Progress Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left 7 Cols: Current Phase & Site Photo Gallery */}
            <div className="lg:col-span-7 flex flex-col">
              <CurrentPhaseCard
                phaseTitle={phaseTitle}
                overallProgress={progress}
                sitePhotos={sitePhotos}
                onOpenGallery={() => setGalleryOpen(true)}
              />
            </div>

            {/* Right 5 Cols: Execution Readiness + Next Big Step */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-6">
              <ExecutionReadinessCard items={readiness} />
              <NextBigStepCard
                title={nextBigStep.title}
                startDate={nextBigStep.startDate}
              />
            </div>
          </div>

          {/* Row 2: Timeline & Milestones + Project Team + Latest Design Revision */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Vertical Timeline & Milestones */}
            <div className="lg:col-span-7">
              <TimelineMilestonesCard
                milestones={milestones}
                onViewSchedule={openContactModal}
              />
            </div>

            {/* Right 5 Cols: Team Card + Latest Revision Card */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <ProjectTeamCard
                teamContacts={team}
                onContactClick={openContactModal}
              />
              <LatestRevisionCard revision={revision} />
            </div>
          </div>

          {/* Footer */}
          <ClientFooter />
        </main>

        {/* Interactive Site Photo Inspection Gallery Modal */}
        <SitePhotoGalleryModal
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          photos={sitePhotos}
        />

        {/* Support Chat & Contact RM */}
        <FloatingSupportChat />
        <ContactRmModal />
      </div>
    </div>
  );
}

export default function MyProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
            <span className="text-sm font-semibold text-gray-500">
              Loading project execution status...
            </span>
          </div>
        </div>
      }
    >
      <ClientDashboardProvider>
        <MyProjectContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
