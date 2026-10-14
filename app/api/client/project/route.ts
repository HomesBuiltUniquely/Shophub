import { NextRequest, NextResponse } from 'next/server';
import { getLeadDetails } from '@/lib/api/erp-client';
import { ProjectPageData } from '@/lib/client/types';
import { getQuoteRoomsForLead } from '@/lib/db/designmod';
import { quoteIdFromDesignLead, resolveDesignLead } from '@/lib/api/design-module-client';
import { mapDesignLeadToProjectPage } from '@/lib/client/mapDesignProject';
import { resolveClientUser } from '@/lib/client/userLeadResolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paramLeadId = searchParams.get('leadId');

    // Resolve authenticated client
    const clientUser = await resolveClientUser(request);

    let effectiveLeadId =
      paramLeadId ||
      clientUser?.leadId ||
      (!clientUser ? process.env.NEXT_PUBLIC_DEFAULT_CLIENT_LEAD_ID || null : null);

    if (effectiveLeadId && /^\d{1,3}$/.test(String(effectiveLeadId))) {
      effectiveLeadId = clientUser?.leadId && String(clientUser.leadId).length >= 4 ? clientUser.leadId : null;
    }

    if (
      effectiveLeadId === '99903' ||
      effectiveLeadId?.includes('99903') ||
      effectiveLeadId?.includes('KJT5T5P7EF') ||
      clientUser?.email?.toLowerCase() === 'go@hubinterior.com'
    ) {
      effectiveLeadId = '99903';
    }

    const leadId = effectiveLeadId || '';

    const designLead = await resolveDesignLead({
      leadId: leadId && String(leadId).replace(/\D/g, '').length >= 4 ? leadId : null,
      email: clientUser?.email,
      phone: clientUser?.phone,
      pid: clientUser?.clientId,
      name: clientUser?.fullName,
    });

    let lead: any = null;
    try {
      lead = await getLeadDetails(designLead?.id || leadId, {
        email: clientUser?.email,
        phone: clientUser?.phone,
        name: clientUser?.fullName,
      });
    } catch {
      lead = null;
    }

    const isLive = Boolean(designLead?.id || (lead && lead.id));

    // Format customer name & ID
    const rawName = clientUser ? clientUser.fullName : (lead?.name || 'Client');
    const cleanName =
      rawName === rawName.toUpperCase()
        ? rawName
            .split(' ')
            .map((w: string) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
            .join(' ')
        : rawName;

    const projectId =
      clientUser?.clientId ||
      lead?.customerId ||
      lead?.customer_id ||
      (lead?.leadIdentifier ? `BLR-${lead.leadIdentifier}` : lead?.leadId ? (String(lead.leadId).startsWith('BLR-') ? lead.leadId : `BLR-${lead.leadId}`) : `BLR-A${String(leadId).replace(/\D/g, '')}`);

    const propertyTitle = clientUser
      ? `${clientUser.propertyType} • ${clientUser.city} ${clientUser.pincode}`
      : `${lead?.propertyType || '3 BHK Apartment'} • ${lead?.propertyLocation || 'Bangalore'}`;

    const designerName = lead?.designerName || lead?.designer_name || designLead?.designerName;
    const designerPhone = lead?.designerPhone;
    const designerEmail = lead?.designerEmail || designLead?.designerEmail;
    const rmName = lead?.assignee || designLead?.salesExecutive;
    const rmPhone = lead?.assigneePhone;
    const rmEmail = lead?.assigneeEmail;

    // Project drawings & quotation
    const fileName = lead?.floorPlanUrl?.includes('REV-A') ? 'Project_Final_REV-A.pdf' : 'Project_Final.pdf';
    const downloadUrl = lead?.floorPlanUrl || `https://hows.hubinterior.com/v1/leads/website/${lead?.id || leadId}/floor-plan?presign=false`;

    // Dynamic quotation room extraction for any client from Prolance / DesignModule snapshots
    let dynamicRooms = null;
    try {
      const quoteIdMatch =
        (lead?.quoteLink && String(lead.quoteLink).match(/\/quote\/(\d+)/)) ||
        (lead?.quote_link && String(lead.quote_link).match(/\/quote\/(\d+)/)) ||
        (lead?.quoteUrl && String(lead.quoteUrl).match(/\/quote\/(\d+)/)) ||
        (lead?.notes && String(lead.notes).match(/\/quote\/(\d+)/));

      const quoteId = quoteIdMatch
        ? quoteIdMatch[1]
        : quoteIdFromDesignLead(designLead) || lead?.prolanceQuoteId || lead?.prolance_quote_id;

      const contactNo = lead?.phone || lead?.contactNo || lead?.contact_no;
      dynamicRooms = await getQuoteRoomsForLead(lead?.id || leadId, quoteId, contactNo);
    } catch (e) {
      console.warn('[Project API] Dynamic rooms error:', e);
    }

    const scopedRooms = (designLead?.configScopeSummary?.selectedRoomNames || []).map((roomName, idx) => ({
      id: `scope-${idx}`,
      roomName,
      title: roomName,
      caption: 'From your design-module configuration scope.',
      date: designLead?.currentMilestoneName || 'In progress',
      imageUrl: '/images/projects/living-dining-r0.jpg',
      isFeatured: idx === 0,
    }));

    const sitePhotos =
      dynamicRooms && dynamicRooms.length > 0 ? dynamicRooms : scopedRooms;

    if (designLead?.id) {
      const quoteId = quoteIdFromDesignLead(designLead);
      const projectData = mapDesignLeadToProjectPage(designLead, {
        clientName: cleanName,
        clientId: projectId,
        propertyTitle,
        sitePhotos,
        quoteLabel: quoteId ? `Quote #${quoteId}` : fileName,
        quoteUrl: quoteId ? `https://design.hubinterior.com/quote/${quoteId}` : downloadUrl,
      });
      return NextResponse.json({
        success: true,
        data: projectData,
        source: 'design-module',
      });
    }

    const projectData: ProjectPageData = {
      projectId,
      clientName: cleanName,
      propertyTitle,
      currentPhaseTitle: lead?.currentMilestoneName || lead?.projectStage || 'Project kickoff',
      overallProgressPercentage: 12,
      sitePhotos,
      readinessItems: [],
      nextBigStep: {
        title: lead?.currentMilestoneName || 'Design consultation',
        startDate: 'Upcoming',
      },
      timelineMilestones: [],
      teamContacts: [
        designerName
          ? {
              id: 'team-1',
              name: designerName,
              role: 'INTERIOR DESIGNER',
              email: designerEmail,
              phone: designerPhone,
              avatarUrl: '',
              actionType: 'email' as const,
            }
          : null,
        rmName
          ? {
              id: 'team-2',
              name: rmName,
              role: 'RELATIONSHIP MANAGER',
              phone: rmPhone,
              email: rmEmail,
              avatarUrl: '',
              actionType: 'call' as const,
            }
          : null,
      ].filter(Boolean) as ProjectPageData['teamContacts'],
      latestRevision: {
        fileName,
        fileSize: '',
        updatedText: 'Awaiting design files',
        downloadUrl,
      },
      isLiveBackend: isLive,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: projectData,
      source: isLive ? 'project-erp' : 'fallback',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
