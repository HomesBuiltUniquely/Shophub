import {
  DESIGN_TRACKER_MILESTONES,
  trackerCompletionPercent,
  trackerStatus,
  type DesignLead,
} from '@/lib/api/design-module-client';
import type { ProjectPageData, ProjectTimelineMilestone } from './types';

function formatWhen(value?: string | null) {
  if (!value) return 'In progress';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function mapDesignLeadToProjectPage(
  lead: DesignLead,
  extras?: {
    clientName?: string;
    clientId?: string;
    propertyTitle?: string;
    sitePhotos?: ProjectPageData['sitePhotos'];
    quoteLabel?: string;
    quoteUrl?: string;
  }
): ProjectPageData {
  const currentIndex = Math.max(0, Math.min(6, Number(lead.currentMilestoneIndex ?? 0)));
  const currentName = lead.currentMilestoneName || DESIGN_TRACKER_MILESTONES[currentIndex].name;
  const progress = trackerCompletionPercent(currentIndex, Number(lead.currentMilestoneProgress || 0));

  const timelineMilestones: ProjectTimelineMilestone[] = DESIGN_TRACKER_MILESTONES.map((milestone) => {
    const status = trackerStatus(currentIndex, milestone.index);
    return {
      id: `ms-${milestone.index}`,
      title: `Milestone ${String(milestone.index + 1).padStart(2, '0')}: ${milestone.name}`,
      date: status === 'completed' ? 'Completed' : status === 'active' ? 'Current' : 'Pending',
      description: milestone.description,
      status,
      estCompletion: status === 'active' ? `${lead.currentMilestoneProgress || 0}% of tasks` : undefined,
    };
  });

  const current = DESIGN_TRACKER_MILESTONES[currentIndex];
  const next = DESIGN_TRACKER_MILESTONES[currentIndex + 1];

  const readinessItems = DESIGN_TRACKER_MILESTONES.slice(
    Math.max(0, currentIndex - 1),
    currentIndex + 2
  ).map((milestone) => {
    const status = trackerStatus(currentIndex, milestone.index);
    return {
      name: milestone.name,
      percentage: status === 'completed' ? 100 : status === 'active' ? Math.max(8, Number(lead.currentMilestoneProgress || 0)) : 0,
      subtext: milestone.description,
      isComplete: status === 'completed',
    };
  });

  const quoteId = lead.prolanceQuoteId || lead.experienceSummary?.quoteId;
  const quoteUrl = extras?.quoteUrl || (quoteId ? `https://design.hubinterior.com/quote/${quoteId}` : lead.floorPlanPublicLink);

  return {
    projectId: extras?.clientId || `BLR-${lead.pid || lead.id}`,
    clientName: extras?.clientName || lead.intakeCustomerName || lead.projectName || 'Client',
    propertyTitle:
      extras?.propertyTitle ||
      `${lead.intakeConfiguration || 'Home'} • ${lead.intakePropertyLocation || 'Bangalore'}`,
    currentPhaseTitle: currentName,
    overallProgressPercentage: Math.max(progress, currentIndex === 0 ? 8 : progress),
    sitePhotos: extras?.sitePhotos || [],
    readinessItems,
    nextBigStep: {
      title: next ? next.name : current.name,
      startDate: formatWhen(lead.updateAt as string | undefined),
    },
    timelineMilestones,
    teamContacts: [
      {
        id: 'team-1',
        name: lead.designerName || 'Design Team',
        role: 'LEAD DESIGNER',
        email: lead.designerEmail,
        phone: undefined,
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        actionType: 'email',
      },
      {
        id: 'team-2',
        name: lead.salesExecutive || lead.projectManagerName || 'Relationship Manager',
        role: 'RELATIONSHIP MANAGER',
        phone: undefined,
        email: undefined,
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        actionType: 'call',
      },
    ],
    latestRevision: {
      fileName: extras?.quoteLabel || (quoteId ? `Quote #${quoteId}` : 'Project files'),
      fileSize: lead.experienceSummary?.quoteAmount
        ? `₹${Number(lead.experienceSummary.quoteAmount).toLocaleString('en-IN')}`
        : 'Live',
      updatedText: current.name,
      downloadUrl: quoteUrl || '',
    },
    isLiveBackend: true,
    lastUpdated: new Date().toISOString(),
  };
}
