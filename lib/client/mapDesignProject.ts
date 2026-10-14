import {
  DESIGN_TRACKER_MILESTONES,
  resolveDesignTracker,
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
  const tracker = resolveDesignTracker(lead);
  const currentIndex = tracker.visualIndex;
  const currentName = tracker.currentName;
  const progress = tracker.overallPercent;

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
    overallProgressPercentage: progress,
    sitePhotos: extras?.sitePhotos || [],
    readinessItems,
    nextBigStep: {
      title: next ? next.name : current.name,
      startDate: formatWhen(lead.updateAt as string | undefined),
    },
    timelineMilestones,
    teamContacts: [
      lead.designerName
        ? {
            id: 'team-1',
            name: lead.designerName,
            role: String(lead.designerRoleLabel || 'INTERIOR DESIGNER').toUpperCase(),
            email: lead.designerEmail,
            phone: undefined,
            avatarUrl: '',
            actionType: 'email' as const,
          }
        : null,
      lead.designManagerName
        ? {
            id: 'team-dm',
            name: lead.designManagerName,
            role: 'DESIGN MANAGER',
            email: lead.designManagerEmail,
            phone: undefined,
            avatarUrl: '',
            actionType: 'email' as const,
          }
        : null,
      lead.salesExecutive
        ? {
            id: 'team-2',
            name: lead.salesExecutive,
            role: 'RELATIONSHIP MANAGER',
            phone: undefined,
            email: undefined,
            avatarUrl: '',
            actionType: 'call' as const,
          }
        : null,
    ].filter(Boolean) as ProjectPageData['teamContacts'],
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
