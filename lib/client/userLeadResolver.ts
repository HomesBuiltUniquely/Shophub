import { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/account';
import type { SessionUser } from '@/lib/auth/session';
import { getHomesMerryDbPool } from '@/lib/db/homesmerry';
import { ClientDashboardData, ClientProfile, JourneyStep, ProjectMetric } from './types';
import { JOURNEY_STEPS } from './clientData';

export interface ResolvedClientInfo {
  id: number;
  fullName: string;
  firstName: string;
  email: string;
  phone: string;
  city: string;
  pincode: string;
  address: string;
  clientId: string;
  leadId: string | null;
  propertyType: string;
  propertyDetails: string;
}

export async function resolveClientUser(request: NextRequest): Promise<ResolvedClientInfo | null> {
  const session = getSessionFromRequest(request);
  if (!session) return null;

  try {
    const pool = getHomesMerryDbPool();
    const normalized = (session.email || '').trim().toLowerCase();

    const [rows]: any = await pool.query(
      `SELECT uuid, email, first_name, last_name, role, phone_number, pincode, city, description, state, brand_name, lead_id
       FROM user
       WHERE LOWER(email) = ? OR uuid = ?
       LIMIT 1`,
      [normalized, session.id]
    );

    const userRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    const firstName = userRow?.first_name || (session.name ? session.name.split(' ')[0] : 'Client');
    const lastName = userRow?.last_name || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || session.name || 'Client';

    const email = userRow?.email || session.email;
    const phone = userRow?.phone_number ? String(userRow.phone_number) : '';
    const city = userRow?.city || 'Bengaluru';
    const pincode = userRow?.pincode ? String(userRow.pincode) : '560001';
    const address = userRow?.description || '';

    // Lead ID priority: userRow.lead_id -> auto-match in DesignMod leads -> session.leadId -> null
    let leadId =
      userRow?.lead_id
        ? String(userRow.lead_id)
        : session.leadId || null;

    let dmLead: any = null;
    try {
      const { resolveDesignLead } = await import('@/lib/api/design-module-client');
      const live = await resolveDesignLead({
        leadId,
        email,
        phone,
      });
      if (live?.id) {
        dmLead = live;
        leadId = String(live.id);
        if (userRow?.uuid && String(userRow.lead_id || '') !== leadId) {
          await pool.query('UPDATE user SET lead_id = ? WHERE uuid = ?', [leadId, userRow.uuid]);
        }
      }
    } catch (err) {
      console.warn('[userLeadResolver] Live design lead error:', err);
    }
    if (!dmLead) {
      try {
        const { getDesignModLead } = await import('@/lib/db/designmod');
        if (email) dmLead = await getDesignModLead(email);
        if (!dmLead && phone) dmLead = await getDesignModLead(phone);
        if (!dmLead && leadId) dmLead = await getDesignModLead(leadId);
        if (dmLead) {
          leadId = String(dmLead.id);
        }
      } catch (err) {
        console.warn('[userLeadResolver] Auto-link error:', err);
      }
    }

    const clientId = dmLead?.pid
      ? `BLR-${dmLead.pid}`
      : leadId
      ? String(leadId).startsWith('BLR-')
        ? leadId
        : `BLR-A${String(leadId).replace(/\D/g, '').padStart(4, '0')}`
      : `BLR-C${String(userRow?.uuid || session.id).padStart(4, '0')}`;

    const configuration = dmLead?.configuration || dmLead?.intakeConfiguration;
    const propertyType = configuration
      ? `${configuration} ${dmLead?.intakeBookingType || 'Apartment'}`
      : address.toLowerCase().includes('bhk')
      ? address
      : '3 BHK Apartment';

    const locationName = dmLead?.propertyLocation || dmLead?.intakePropertyLocation || city;
    const propertyDetails = `${locationName} • ${pincode}`;

    return {
      id: Number(userRow?.uuid || session.id),
      fullName,
      firstName,
      email,
      phone,
      city,
      pincode,
      address,
      clientId,
      leadId,
      propertyType,
      propertyDetails,
    };
  } catch (err) {
    console.warn('[resolveClientUser] Error fetching user profile:', err);
    const firstName = session.name ? session.name.split(' ')[0] : 'Client';
    return {
      id: session.id,
      fullName: session.name || 'Client',
      firstName,
      email: session.email,
      phone: '',
      city: 'Bengaluru',
      pincode: '560001',
      address: '',
      clientId: `BLR-C${String(session.id).padStart(4, '0')}`,
      leadId: session.leadId || null,
      propertyType: '2 BHK Apartment',
      propertyDetails: 'Bengaluru • 560001',
    };
  }
}

/**
 * Build initial personalized dashboard data for a client who does not have a live CRM lead yet
 */
export function buildClientInitialDashboard(client: ResolvedClientInfo): ClientDashboardData {
  const profile: ClientProfile = {
    name: client.fullName,
    clientId: client.clientId,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    projectGreeting: 'Your home is progressing beautifully. Check out the detailed progress',
    propertyType: client.propertyType,
    propertyDetails: client.propertyDetails,
    leadId: client.leadId || String(client.id),
    phone: client.phone,
    email: client.email,
    memberTier: 'Premium Member',
  };

  const metrics: ProjectMetric[] = [
    {
      title: 'CURRENT STAGE',
      value: 'BOOKING',
      type: 'stage',
    },
    {
      title: 'COMPLETION',
      value: '12%',
      percentage: 12,
      type: 'completion',
    },
    {
      title: 'NEXT MILESTONE',
      value: 'D1 SITE MEASUREMENT',
      type: 'milestone',
    },
    {
      title: 'PENDING PAYMENT',
      value: '₹0',
      subtext: 'Booking confirmed',
      type: 'payment',
    },
  ];

  const journeySteps: JourneyStep[] = JOURNEY_STEPS.map((step, idx) => {
    if (idx === 0) {
      return { ...step, status: 'in_progress', dateOrStatus: 'IN PROGRESS' };
    }
    if (idx === 1) {
      return { ...step, status: 'next', dateOrStatus: 'NEXT STEP' };
    }
    return { ...step, status: 'pending', dateOrStatus: 'PENDING' };
  });

  return {
    profile,
    metrics,
    journeySteps,
    upcomingActions: [
      {
        id: 'action-1',
        title: 'Initial Design Consultation',
        subtitle: 'Meet with your dedicated Interior Designer to finalize your project requirements.',
        type: 'appointment',
        actionText: 'View Schedule',
      },
      {
        id: 'action-2',
        title: 'Site Measurement Prep',
        subtitle: 'Our technical site team will visit for architectural laser measurement.',
        type: 'material',
        actionText: 'Prepare Checklist',
      },
    ],
    actionCards: [
      {
        id: 'card-1',
        title: 'Explore Master Catalog',
        description: 'Browse our curated modular and designer offerings tailored for your space.',
        buttonText: 'View Catalog',
        href: '/offerings',
        variant: 'black',
        icon: 'catalog',
      },
      {
        id: 'card-2',
        title: 'Design Inspirations',
        description: 'Discover trending living rooms, modern kitchens, and master bedrooms.',
        buttonText: 'Browse Gallery',
        href: '/client/my-project',
        variant: 'white',
        icon: 'inspiration',
      },
      {
        id: 'card-3',
        title: 'Refer a Friend & Earn',
        description: 'Invite family or friends to Hub Interior and earn ₹25,000 on their booking.',
        buttonText: 'Invite Friends',
        href: '/client',
        variant: 'red',
        icon: 'referral',
      },
    ],
    team: {
      relationshipManager: {
        role: 'Relationship Manager',
        name: 'Sharanya',
        phone: '+91 87550 09932',
        email: 'chitarala@hubinterior.com',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      },
      designer: {
        role: 'Lead Designer',
        name: 'Seher',
        phone: '+91 97405 44327',
        email: 'seher@hubinterior.com',
        avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      },
    },
    paymentSummary: {
      quoteNum: 'Q-INIT-001',
      quoteId: null,
      quoteUrl: undefined,
      totalQuotationValue: 0,
      totalQuotationValueFormatted: '₹0',
      cumulativeTarget: 0,
      cumulativeTargetFormatted: '₹0',
      cumulativePercentLabel: 'Initial Booking Stage',
      alreadyPaid: 0,
      alreadyPaidFormatted: '₹0',
      amountToCollectNow: 0,
      amountToCollectNowFormatted: '₹0',
      remainingBalance: 0,
      remainingBalanceFormatted: '₹0',
      stageNote: 'Initial booking token confirmed. Design consultation and site measurement in progress.',
    },
    leadId: client.leadId || String(client.id),
    isLiveBackend: true,
    lastUpdated: new Date().toISOString(),
  };
}
