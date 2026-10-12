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
  const phaseTitle = projectData?.currentPhaseTitle || 'Modular Carpentry Installation';
  const progress = projectData?.overallProgressPercentage ?? 68;
  const sitePhotos = projectData?.sitePhotos || [
    {
      id: 'photo-kitchen',
      roomName: 'Kitchen - [R0]',
      title: 'Kitchen - [R0]',
      caption: 'Upper loft cabinets in ceramic finish, lower base units with aluminium handles, Jet Black granite countertop with integrated hob and chimney hood.',
      date: 'Design Approved',
      imageUrl: '/images/projects/kitchen-r0.jpg',
      isFeatured: true,
    },
    {
      id: 'photo-living',
      roomName: 'Living & Dining - [R0]',
      title: 'Living & Dining - [R0]',
      caption: 'Feature TV wall with curved arch wallpaper backdrop, suspended cabinetry with brass accents, CNC jaali partition, and hallway gypsum archway.',
      date: 'Design Approved',
      imageUrl: '/images/projects/living-dining-r0.jpg',
    },
    {
      id: 'photo-mbr',
      roomName: 'Master bedroom - [R0]',
      title: 'Master bedroom - [R0]',
      caption: 'Floor-to-ceiling wardrobe in natural oak veneer finish with aluminium profile handles, subtle wall trims, and warm textured paint accent wall.',
      date: 'Design Approved',
      imageUrl: '/images/projects/master-bedroom-r0.jpg',
    },
    {
      id: 'photo-kbr',
      roomName: 'Guest bedroom - [R0]',
      title: 'Guest bedroom - [R0]',
      caption: 'Integrated study desk with open pine wood ledges, tall storage unit with tandem drawers in macchiato, and fluted glass aluminium profile wardrobe.',
      date: 'Design Approved',
      imageUrl: '/images/projects/guest-bedroom-r0.jpg',
    },
  ];
  const readiness = projectData?.readinessItems || [
    { name: 'Material Sourcing', percentage: 100, subtext: 'All premium finishes arrived at warehouse.', isComplete: true },
    { name: 'Factory Production', percentage: 85, subtext: 'Modular units for Guest Room in final assembly.', isComplete: false },
    { name: 'On-Site Installation', percentage: 42, subtext: 'Flooring complete. Cabinetry framing in progress.', isComplete: false },
  ];
  const nextBigStep = projectData?.nextBigStep || {
    title: 'Hardwood Flooring Polish',
    startDate: 'Starting June 24, 2024',
  };
  const milestones = projectData?.timelineMilestones || [
    { id: '1', title: 'Civil & Electrical Modifications', date: 'May 28', description: 'Concealed wiring, lighting points, and partition walls finalized.', status: 'completed' as const },
    { id: '2', title: 'Flooring Installation', date: 'June 05', description: 'Italian marble laying and initial grinding in living areas.', status: 'completed' as const },
    { id: '3', title: 'Modular Carpentry Installation', date: 'June 20', description: 'Kitchen cabinets and wardrobe frameworks are being fitted.', status: 'active' as const, estCompletion: 'Est. Completion: June 20' },
    { id: '4', title: 'False Ceiling & Painting', date: 'June 25', description: 'Installation of POP designs followed by base coat paint.', status: 'upcoming' as const },
    { id: '5', title: 'Project Handover', date: 'July 15', description: 'Deep cleaning, final snag check, and key handover ceremony.', status: 'upcoming' as const },
  ];
  const team = projectData?.teamContacts || [
    { id: '1', name: 'Seher', role: 'LEAD DESIGNER', email: 'seher@hubinterior.com', avatarUrl: '', actionType: 'email' as const },
    { id: '2', name: 'Sharanya', role: 'RELATIONSHIP MANAGER', phone: '+918755009932', avatarUrl: '', actionType: 'call' as const },
    { id: '3', name: 'Sohan', role: 'PROJECT MANAGER', phone: '+919741167755', avatarUrl: '', actionType: 'chat' as const },
  ];
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
