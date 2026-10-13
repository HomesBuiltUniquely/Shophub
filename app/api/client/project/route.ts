import { NextRequest, NextResponse } from 'next/server';
import { getLeadDetails } from '@/lib/api/erp-client';
import { ProjectPageData } from '@/lib/client/types';
import { getQuoteRoomsForLead } from '@/lib/db/designmod';

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

    let lead: any = null;
    if (effectiveLeadId) {
      try {
        lead = await getLeadDetails(leadId);
      } catch {
        lead = null;
      }
    }

    const isLive = Boolean(lead && lead.id);

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
        : lead?.prolanceQuoteId ||
          lead?.prolance_quote_id ||
          (String(leadId) === '462' || String(lead?.id) === '462' ? '73761' : undefined);

      const contactNo = lead?.phone || lead?.contactNo || lead?.contact_no;
      dynamicRooms = await getQuoteRoomsForLead(lead?.id || leadId, quoteId, contactNo);
    } catch (e) {
      console.warn('[Project API] Dynamic rooms error:', e);
    }

    const defaultRooms = [
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

    const sitePhotos = dynamicRooms && dynamicRooms.length > 0 ? dynamicRooms : defaultRooms;

    const isClient99903 =
      cleanName.toLowerCase().includes('client') ||
      String(leadId).includes('99903') ||
      String(leadId).includes('KJT5T5P7EF') ||
      String(lead?.id) === '99903';

    const isStage10Payment =
      isClient99903 ||
      lead?.stage?.milestoneStage === '10% PAYMENT' ||
      lead?.stage?.stage === '10% PAYMENT';

    const currentPhaseTitle = isStage10Payment
      ? '10% Payment & Site Masking Prep'
      : 'Modular Carpentry Installation';

    const overallProgressPercentage = isStage10Payment ? 24 : 68;

    const readinessItems = isStage10Payment
      ? [
          {
            name: 'DQC1 DWG & Quotation',
            percentage: 100,
            subtext: 'Quote #75774 (Q-53993-019) verified & approved for ₹13,33,946.',
            isComplete: true,
          },
          {
            name: '10% Design Advance',
            percentage: 50,
            subtext: 'Sales 10% cleared (₹1,33,395). Design 10% active (₹1,33,395).',
            isComplete: false,
          },
          {
            name: 'D2 Site Masking & Prep',
            percentage: 0,
            subtext: 'Site masking scheduled once 10% milestone is confirmed.',
            isComplete: false,
          },
        ]
      : [
          {
            name: 'Material Sourcing',
            percentage: 100,
            subtext: 'All premium finishes arrived at warehouse.',
            isComplete: true,
          },
          {
            name: 'Factory Production',
            percentage: 85,
            subtext: 'Modular units for Guest Room in final assembly.',
            isComplete: false,
          },
          {
            name: 'On-Site Installation',
            percentage: 42,
            subtext: 'Flooring complete. Cabinetry framing in progress.',
            isComplete: false,
          },
        ];

    const nextBigStep = isStage10Payment
      ? {
          title: 'D2 Site Masking & Files Upload',
          startDate: 'Oct 12 - Oct 15',
        }
      : {
          title: 'Dispatch to Site for Installation',
          startDate: 'Upcoming',
        };

    const timelineMilestones = isStage10Payment
      ? [
          {
            id: 'step-1',
            title: 'Booking Closure (10%)',
            date: 'Completed',
            description: 'Sales token of ₹1,33,395 collected and booking verified.',
            status: 'completed' as const,
          },
          {
            id: 'step-2',
            title: 'Milestone 02: DQC1 Review',
            date: 'Oct 12',
            description: 'DQC 1 submission - dwg + quotation approved on time.',
            status: 'completed' as const,
          },
          {
            id: 'step-3',
            title: 'Milestone 03: 10% Payment',
            date: 'Oct 12 - Oct 15',
            description: 'Design module 10% payment brings cumulative to 20% (₹1,33,395 due now).',
            status: 'active' as const,
            estCompletion: 'Due Oct 15',
          },
          {
            id: 'step-4',
            title: 'Milestone 04: D2 Site Masking',
            date: 'Oct 16',
            description: 'Site masking request raise and physical dimensions review.',
            status: 'upcoming' as const,
          },
          {
            id: 'step-5',
            title: 'Milestone 05: DQC2 Final Sign-off',
            date: 'Oct 28',
            description: 'Material finishes freeze and 40% design sign-off.',
            status: 'upcoming' as const,
          },
          {
            id: 'step-6',
            title: 'Milestone 06: Push to Production',
            date: 'Nov 10',
            description: 'Factory manufacturing and CNC cutting dispatch.',
            status: 'upcoming' as const,
          },
        ]
      : [
          {
            id: 'step-1',
            title: 'Civil & Electrical Modifications',
            date: 'Completed',
            description: 'Concealed wiring, lighting points, and partition walls finalized.',
            status: 'completed' as const,
          },
          {
            id: 'step-2',
            title: 'Flooring Installation',
            date: 'Completed',
            description: 'Italian marble laying and initial grinding in living areas.',
            status: 'completed' as const,
          },
          {
            id: 'step-3',
            title: 'Modular Carpentry Installation',
            date: 'In Progress',
            description: 'Kitchen cabinets and wardrobe frameworks are being fitted.',
            status: 'active' as const,
            estCompletion: 'In Progress',
          },
          {
            id: 'step-4',
            title: 'False Ceiling & Painting',
            date: 'Upcoming',
            description: 'Installation of POP designs followed by base coat paint.',
            status: 'upcoming' as const,
          },
          {
            id: 'step-5',
            title: 'Project Handover',
            date: 'Upcoming',
            description: 'Deep cleaning, final snag check, and key handover ceremony.',
            status: 'upcoming' as const,
          },
        ];

    const teamContacts = [
      {
        id: 'team-1',
        name: designerName,
        role: 'LEAD DESIGNER',
        email: designerEmail,
        phone: designerPhone,
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        actionType: 'email' as const,
      },
      {
        id: 'team-2',
        name: rmName,
        role: 'RELATIONSHIP MANAGER',
        phone: rmPhone,
        email: rmEmail,
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        actionType: 'call' as const,
      },
      {
        id: 'team-3',
        name: 'Vikram Mehta',
        role: 'SITE ENGINEER',
        phone: '+91 97405 49568',
        email: 'vikram@hubinterior.com',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        actionType: 'chat' as const,
      },
    ];

    const projectData: ProjectPageData = {
      projectId,
      clientName: cleanName,
      propertyTitle,
      currentPhaseTitle,
      overallProgressPercentage,
      sitePhotos,
      readinessItems,
      nextBigStep,
      timelineMilestones,
      teamContacts,
      latestRevision: {
        fileName: isClient99903 ? 'CLIENT_QUOTATION_Q-53993-019.pdf' : fileName,
        fileSize: isClient99903 ? '4.8 MB' : '12.4 MB',
        updatedText: isClient99903
          ? 'Quote #75774 (Q-53993-019) • Approved'
          : 'Updated recently • 12.4 MB',
        downloadUrl: isClient99903 ? 'https://design.hubinterior.com/quote/75774' : downloadUrl,
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
