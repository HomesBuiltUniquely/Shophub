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

    if (
      effectiveLeadId === '99903' ||
      effectiveLeadId?.includes('99903') ||
      effectiveLeadId?.includes('KJT5T5P7EF') ||
      clientUser?.email?.toLowerCase() === 'go@hubinterior.com'
    ) {
      effectiveLeadId = '99903';
    }

    if (!effectiveLeadId && clientUser) {
      return NextResponse.json({
        success: true,
        data: {
          projectId: clientUser.clientId,
          clientName: clientUser.fullName,
          propertyTitle: `${clientUser.propertyType} • ${clientUser.city} ${clientUser.pincode}`,
          currentPhaseTitle: 'Initial Consultation & Site Measurement',
          overallProgressPercentage: 12,
          sitePhotos: [],
          readinessItems: [
            {
              name: 'Design Consultation',
              percentage: 100,
              subtext: 'Initial consultation booked with Interior Designer.',
              isComplete: true,
            },
            {
              name: 'Site Measurement Prep',
              percentage: 0,
              subtext: 'Laser measurement scheduled for site dimensions.',
              isComplete: false,
            },
          ],
          nextBigStep: {
            title: 'Initial Design Consultation & Site Measurement',
            startDate: 'Ongoing',
          },
          timelineMilestones: [
            {
              id: 'step-1',
              title: 'Booking Closure',
              date: 'Completed',
              description: 'Initial booking token confirmed.',
              status: 'completed' as const,
            },
            {
              id: 'step-2',
              title: 'D1 Site Measurement',
              date: 'Next',
              description: 'Site architectural measurements and laser scan.',
              status: 'active' as const,
              estCompletion: 'Upcoming',
            },
            {
              id: 'step-3',
              title: 'DQC1 Drawing & 10% Payment',
              date: 'Pending',
              description: 'Detailed drawings and 10% milestone payment.',
              status: 'upcoming' as const,
            },
          ],
          teamContacts: [
            {
              id: 'team-1',
              name: 'Design Team',
              role: 'LEAD DESIGNER',
              phone: '+91 97405 44327',
              email: 'design@hubinterior.com',
              avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
              actionType: 'call' as const,
            },
            {
              id: 'team-2',
              name: 'Relationship Manager',
              role: 'RELATIONSHIP MANAGER',
              phone: '+91 87550 09932',
              email: 'support@hubinterior.com',
              avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
              actionType: 'call' as const,
            },
          ],
          latestRevision: {
            fileName: 'Project_Onboarding.pdf',
            fileSize: '1.2 MB',
            updatedText: 'Booking Token Confirmed',
            downloadUrl: undefined,
          },
          isLiveBackend: true,
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    if (!effectiveLeadId) {
      return NextResponse.json({ success: false, error: 'No active project found' }, { status: 404 });
    }

    const leadId = effectiveLeadId;

    const designLead = await resolveDesignLead({
      leadId,
      email: clientUser?.email,
      phone: clientUser?.phone,
      pid: clientUser?.clientId,
    });

    let lead: any = null;
    try {
      lead = await getLeadDetails(designLead?.id || leadId, {
        email: clientUser?.email,
        phone: clientUser?.phone,
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

    // Lead Designer from CRM or fallback
    const designerName = lead?.designerName || lead?.designer_name || 'Design Team';
    const designerPhone = lead?.designerPhone || lead?.assigneePhone || '+91 97405 44327';
    const designerEmail = lead?.designerEmail || 'design@hubinterior.com';

    // Assigned Relationship Manager
    const rmName = lead?.assignee || 'Relationship Manager';
    const rmPhone = lead?.assigneePhone || '+91 87550 09932';
    const rmEmail = lead?.assigneeEmail || 'support@hubinterior.com';

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
      if (lead?.designerName) {
        projectData.teamContacts = projectData.teamContacts.map((contact) =>
          contact.role === 'LEAD DESIGNER'
            ? { ...contact, name: designerName, email: designerEmail, phone: designerPhone }
            : contact.role === 'RELATIONSHIP MANAGER'
              ? { ...contact, name: rmName, phone: rmPhone, email: rmEmail }
              : contact
        );
      }
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
        {
          id: 'team-1',
          name: designerName,
          role: 'LEAD DESIGNER',
          email: designerEmail,
          phone: designerPhone,
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
          actionType: 'email',
        },
        {
          id: 'team-2',
          name: rmName,
          role: 'RELATIONSHIP MANAGER',
          phone: rmPhone,
          email: rmEmail,
          avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
          actionType: 'call',
        },
      ],
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
