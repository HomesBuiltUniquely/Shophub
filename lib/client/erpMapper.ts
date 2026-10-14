import {
  ClientDashboardData,
  ClientProfile,
  ProjectMetric,
  JourneyStep,
  UpcomingActionItem,
  ActionCardItem,
  AssignedTeam,
  MilestonePaymentSummaryData,
} from './types';
import {
  CLIENT_METRICS,
  JOURNEY_STEPS,
  UPCOMING_ACTIONS,
  ACTION_CARDS,
  DEFAULT_PAYMENT_SUMMARY,
} from './clientData';
import { resolveDesignTracker } from '@/lib/api/design-module-client';

interface RawErpData {
  lead?: any;
  pipeline?: any;
  hubQuote?: any;
  paymentLink?: any;
  appointments?: any[];
  floorPlan?: any;
  designPayment?: any;
}

/**
 * Filter out CRM internal sales tags, survey forms, and junk keywords
 */
function sanitizeString(raw?: string): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();

  // Internal CRM sales/disqualification tags to NEVER show to a client
  const junkPatterns = [
    'fake',
    'spam',
    'rnr',
    'follow up',
    'call back',
    'wrong number',
    'lost to competition',
    'not interested',
    'constraint',
    'timeline ?',
    'essential interiors',
    '4 lakhs onwards',
    'will call',
    'test',
    'select source',
    'fresh data',
  ];

  for (const pattern of junkPatterns) {
    if (lower.includes(pattern)) {
      return null;
    }
  }

  return raw.trim();
}

/**
 * Transform ERP data into a refined, Pinterest-aesthetic ClientDashboardData
 */
export function mapErpToDashboard(raw: RawErpData, fallbackLeadId = ''): ClientDashboardData {
  const isLive = Boolean(raw.lead && (raw.lead.id || raw.lead.name));
  const lead = raw.lead || {};

  // Clean customer name (Default: Client)
  const rawName = lead.name ? lead.name.trim() : (lead.customerName ? lead.customerName.trim() : '');
  let clientName = 'Client';
  if (
    rawName &&
    !rawName.toLowerCase().includes('test') &&
    !rawName.toLowerCase().includes('prabhu') &&
    !rawName.toLowerCase().includes('sagar')
  ) {
    if (rawName === rawName.toUpperCase()) {
      clientName = rawName
        .split(' ')
        .map((w: string) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join(' ');
    } else {
      clientName = rawName;
    }
  }

  // Clean customer ID
  const cleanId =
    lead.customerId ||
    lead.customer_id ||
    (lead.leadId || lead.lead_identifier || lead.leadIdentifier
      ? `BLR-${lead.leadIdentifier || lead.lead_identifier || String(lead.leadId).replace(/\D/g, '')}`
      : fallbackLeadId
      ? `BLR-A${String(fallbackLeadId).replace(/\D/g, '').padStart(4, '0')}`
      : 'BLR-CLIENT');

  // Clean property type (e.g. 2 BHK Apartment)
  let propType = '2 BHK Apartment';
  const rawProp = lead.propertyType || lead.property_type;
  if (rawProp && !rawProp.includes('Timeline') && !rawProp.includes('Lakhs')) {
    propType = rawProp.includes('BHK') ? `${rawProp} Apartment` : rawProp;
  } else if (lead.budget) {
    const bhkMatch = String(lead.budget).match(/(\d+\s*BHK)/i);
    const bookingType = lead.bookingType || lead.booking_type
      ? ` ${String(lead.bookingType || lead.booking_type).toLowerCase().replace(/^./, (c: string) => c.toUpperCase())}`
      : ' Apartment';
    if (bhkMatch) {
      propType = `${bhkMatch[1]}${bookingType}`;
    }
  }

  const pinCode = lead.pinCode || lead.pin_code || lead.propertyPin || '560076';
  const propDetails = `Bangalore • ${pinCode}`;

  // Clean, high-end greeting
  const projectGreeting = 'Your home is progressing beautifully. Check out the detailed progress';

  const profile: ClientProfile = {
    name: clientName,
    clientId: cleanId,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    projectGreeting,
    propertyType: propType,
    propertyDetails: propDetails,
    leadId: lead.id ? String(lead.id) : (lead.leadId || lead.lead_identifier || fallbackLeadId || ''),
    phone: lead.phoneNumber || lead.phone_number || lead.contactNo || '',
    email: lead.email || lead.clientEmail || '',
  };

  // 3. Design Module 10% - 10% - 40% - 40% Milestone Payment Breakdown & Remaining Balance
  const dp = raw.designPayment;
  const quotePayloadData = (lead.quotePayload as { data?: Record<string, any> } | undefined)?.data;
  const quoteNum =
    quotePayloadData?.quoteNum ||
    dp?.quoteNum ||
    (lead.quoteNum ? String(lead.quoteNum) : lead.prolanceQuoteId ? `Q-${lead.prolanceQuoteId}` : 'Q-PROJ-001');
  const quoteId =
    Number(lead.quoteId) ||
    Number(lead.prolanceQuoteId) ||
    (quotePayloadData?.quoteID ? Number(quotePayloadData.quoteID) : null) ||
    (dp?.quoteId ? Number(dp.quoteId) : null);

  // Total Quotation Value (latest)
  let totalQuoteValue = 0;
  if (quotePayloadData?.finalTotalPrice || quotePayloadData?.totalPrice) {
    totalQuoteValue = Number(quotePayloadData.finalTotalPrice || quotePayloadData.totalPrice) || 0;
  } else if (dp?.totalPayableAmount && Number(dp.totalPayableAmount) > 0 && Number(dp.leadId || lead.id) === Number(lead.id)) {
    totalQuoteValue = Number(dp.totalPayableAmount);
  } else if (raw.hubQuote?.totalPayableAmount && Number(raw.hubQuote.totalPayableAmount) > 0) {
    totalQuoteValue = Number(raw.hubQuote.totalPayableAmount);
  } else if (lead.totalPayableAmount && Number(lead.totalPayableAmount) > 0) {
    totalQuoteValue = Number(lead.totalPayableAmount);
  }

  // Already Paid (sales + design modules)
  let alreadyPaid = 0;
  if (dp?.totalPaidCumulative && Number(dp.totalPaidCumulative) > 0 && Number(dp.leadId || lead.id) === Number(lead.id)) {
    alreadyPaid = Number(dp.totalPaidCumulative);
  } else if (lead.totalPaidCumulative && Number(lead.totalPaidCumulative) > 0) {
    alreadyPaid = Number(lead.totalPaidCumulative);
  }

  // 2. Stage calculation based on CRM stage and payments
  const hasDesignTracker =
    lead.currentMilestoneIndex !== undefined &&
    lead.currentMilestoneIndex !== null &&
    String(lead.currentMilestoneIndex) !== '';
  const tracker = resolveDesignTracker({
    currentMilestoneIndex: hasDesignTracker ? Number(lead.currentMilestoneIndex) : undefined,
    currentMilestoneName: lead.currentMilestoneName,
    currentMilestoneProgress: lead.currentMilestoneProgress,
    taskCompletions: Array.isArray(lead.taskCompletions) ? lead.taskCompletions : [],
  });
  const currentStage = tracker.currentName;
  const stepIndex = tracker.visualIndex;
  const completionPercentage = tracker.overallPercent;
  const nextMilestone = tracker.nextName;

  // Targets based on official milestones
  const twentyPercentTarget =
    dp?.twentyPercentTarget && Number(dp.twentyPercentTarget) > 0
      ? Number(dp.twentyPercentTarget)
      : Math.round(totalQuoteValue * 0.20);

  const sixtyPercentTarget =
    dp?.sixtyPercentTarget && Number(dp.sixtyPercentTarget) > 0
      ? Number(dp.sixtyPercentTarget)
      : Math.round(totalQuoteValue * 0.60);

  // Milestone specific amounts
  const amountToCollect10 =
    typeof dp?.amountToCollect10 === 'number' && dp.amountToCollect10 >= 0
      ? dp.amountToCollect10
      : Math.max(0, twentyPercentTarget - alreadyPaid);

  const amountToCollect40 =
    typeof dp?.amountToCollect40 === 'number' && dp.amountToCollect40 >= 0
      ? dp.amountToCollect40
      : Math.max(0, sixtyPercentTarget - alreadyPaid);

  const remainingAfterTwentyPercent =
    typeof dp?.remainingAfterTwentyPercent === 'number' && dp.remainingAfterTwentyPercent > 0
      ? dp.remainingAfterTwentyPercent
      : Math.max(0, totalQuoteValue - twentyPercentTarget);

  const remainingAfterSixtyPercent =
    typeof dp?.remainingAfterSixtyPercent === 'number' && dp.remainingAfterSixtyPercent > 0
      ? dp.remainingAfterSixtyPercent
      : Math.max(0, totalQuoteValue - sixtyPercentTarget);

  let amountToCollectNow = 0;
  let remainingBalance = Math.max(0, totalQuoteValue - alreadyPaid);
  let cumulativeTarget = totalQuoteValue;
  let cumulativePercentLabel = 'Project quotation';
  let paymentMilestoneLabel = 'Upcoming payment';
  let stageNote = 'Milestone payments follow the design-module tracker for this project.';

  if (alreadyPaid >= sixtyPercentTarget - 100 || stepIndex >= 7) {
    amountToCollectNow = 0;
    remainingBalance = remainingAfterSixtyPercent;
    cumulativeTarget = sixtyPercentTarget;
    cumulativePercentLabel = '60% Cumulative Target Met (Booking 10% + Design 10% + Sign-off 40%)';
    paymentMilestoneLabel = 'Factory Production Advance (Paid)';
    stageNote =
      '60% cumulative milestone paid & verified. Remaining 40% balance due across factory production and site handover.';
  } else if (stepIndex > 3 && stepIndex <= 6) {
    amountToCollectNow = amountToCollect40;
    remainingBalance = remainingAfterSixtyPercent;
    cumulativeTarget = sixtyPercentTarget;
    cumulativePercentLabel = '60% Cumulative Target (Sales 10% + Design 10% + Design 40%)';
    paymentMilestoneLabel = '40% Design Sign-off';
    stageNote = 'Design module 40% payment brings the customer to 60% cumulative of the latest quotation.';
  } else if (stepIndex === 3) {
    amountToCollectNow = amountToCollect10;
    remainingBalance = remainingAfterTwentyPercent;
    cumulativeTarget = twentyPercentTarget;
    cumulativePercentLabel = '20% Cumulative Target (Sales 10% + Design 10%)';
    paymentMilestoneLabel = '10% Design Advance';
    stageNote =
      'Design module 10% payment brings the customer to 20% of the latest quotation.';
  } else if (stepIndex > 6) {
    amountToCollectNow = remainingAfterSixtyPercent;
    remainingBalance = 0;
    cumulativeTarget = totalQuoteValue;
    cumulativePercentLabel = '100% Project Completion';
    paymentMilestoneLabel = 'Final Execution Balance';
    stageNote = 'Final balance payment for site completion and handover.';
  }

  // Override amount to collect if an explicit active Easebuzz link exists
  if (raw.paymentLink && raw.paymentLink.amount && Number(raw.paymentLink.amount) > 0) {
    amountToCollectNow = Number(raw.paymentLink.amount);
    if (raw.paymentLink.purpose) {
      paymentMilestoneLabel = raw.paymentLink.purpose;
    }
  }

  const pendingPaymentStr = `₹${amountToCollectNow.toLocaleString('en-IN')}`;
  const remainingBalanceStr = `₹${remainingBalance.toLocaleString('en-IN')}`;
  const alreadyPaidStr = `₹${alreadyPaid.toLocaleString('en-IN')}`;

  const effectiveQuoteUrl =
    lead.quoteLink ||
    lead.quoteSentInfo?.quoteLink ||
    raw.hubQuote?.hubCustomerQuoteUrl ||
    (quoteId ? `https://design.hubinterior.com/quote/${quoteId}` : undefined);

  const paymentSummary: MilestonePaymentSummaryData = {
    quoteNum,
    quoteId,
    quoteUrl: effectiveQuoteUrl,
    totalQuotationValue: totalQuoteValue,
    totalQuotationValueFormatted: `₹${totalQuoteValue.toLocaleString('en-IN')}`,
    cumulativeTarget,
    cumulativeTargetFormatted: `₹${cumulativeTarget.toLocaleString('en-IN')}`,
    cumulativePercentLabel,
    alreadyPaid,
    alreadyPaidFormatted: alreadyPaidStr,
    amountToCollectNow,
    amountToCollectNowFormatted: pendingPaymentStr,
    remainingBalance,
    remainingBalanceFormatted: remainingBalanceStr,
    stageNote,
  };

  // 4. Top Metrics
  const metrics: ProjectMetric[] = [
    {
      title: 'CURRENT STAGE',
      value: currentStage,
      type: 'stage',
    },
    {
      title: 'COMPLETION',
      value: `${completionPercentage}%`,
      percentage: completionPercentage,
      type: 'completion',
    },
    {
      title: 'NEXT MILESTONE',
      value: nextMilestone,
      type: 'milestone',
    },
    {
      title: 'PENDING PAYMENT',
      value: amountToCollectNow > 0 ? pendingPaymentStr : remainingBalanceStr,
      subtext: `Paid: ${alreadyPaidStr}`,
      type: 'payment',
    },
  ];

  // 5. Journey Steps (Booking -> Design -> Production -> Installation -> QC Check -> Handover -> Warranty)
  const journeySteps: JourneyStep[] = JOURNEY_STEPS.map((step, idx) => {
    let status: JourneyStep['status'] = 'pending';
    let dateOrStatus = step.dateOrStatus;

    if (idx < stepIndex) {
      status = 'completed';
      dateOrStatus = 'COMPLETED';
    } else if (idx === stepIndex) {
      status = 'in_progress';
      dateOrStatus = 'IN PROGRESS';
    } else if (idx === stepIndex + 1) {
      status = 'next';
      dateOrStatus = 'NEXT STEP';
    } else {
      status = 'pending';
      dateOrStatus = 'PENDING';
    }

    return {
      id: step.id,
      name: step.name,
      icon: step.icon,
      status,
      dateOrStatus,
    };
  });

  // 6. Upcoming Actions
  const upcomingActions: UpcomingActionItem[] = [];

  // Quote Review
  const quoteUrl = effectiveQuoteUrl;
  const displayQuoteNumber =
    lead.quoteSentInfo?.quoteId ||
    raw.hubQuote?.hubQuoteId ||
    quoteId ||
    (quoteUrl ? quoteUrl.match(/quote\/(\d+)/)?.[1] || '' : '');
  const quoteAuthor = lead.quoteSentInfo?.quoteSentBy || lead.assignee || 'Design Team';

  upcomingActions.push({
    id: 'act-quote',
    title: 'Review Latest Quote',
    subtitle: `Quote #${displayQuoteNumber} prepared by ${quoteAuthor}.`,
    type: 'quote',
    href: quoteUrl,
    actionText: 'View Quote',
    isExternal: true,
  });

  // Material Approvals
  const materialUrl =
    lead.designQaLink ||
    lead.designQaQuizUrl ||
    (lead.leadId ? `https://design.hubinterior.com/DesignQA?id=${lead.leadId}` : '/client/my-project');
  upcomingActions.push({
    id: 'act-material',
    title: 'Approve Materials',
    subtitle: 'Select finishes & specifications for your 4 BHK.',
    type: 'material',
    href: materialUrl,
    actionText: 'Review Specs',
    isExternal: Boolean(materialUrl.startsWith('http')),
  });

  // Milestone Payment
  if (amountToCollectNow > 0) {
    upcomingActions.push({
      id: 'act-payment',
      title: 'Milestone Payment',
      subtitle: `${paymentMilestoneLabel} | Collect: ${pendingPaymentStr} • Balance: ${remainingBalanceStr}`,
      type: 'payment',
      href: raw.paymentLink?.paymentUrl || '/client/payments',
      actionText: 'Pay Now',
      isExternal: Boolean(raw.paymentLink?.paymentUrl),
    });
  } else {
    upcomingActions.push({
      id: 'act-payment',
      title: 'Payments Up to Date',
      subtitle: `60% cleared (₹${alreadyPaid.toLocaleString('en-IN')}) • Balance: ${remainingBalanceStr}`,
      type: 'payment',
      href: '/client/payments',
      actionText: 'View Schedule',
      isExternal: false,
    });
  }

  // 7. Action Cards
  const actionCards: ActionCardItem[] = ACTION_CARDS.map((card) => {
    if (card.id === 'card-payment') {
      return {
        ...card,
        href: '/client/payments',
        buttonText: amountToCollectNow > 0 ? `PAY ${pendingPaymentStr}` : 'VIEW SCHEDULE',
        description:
          amountToCollectNow > 0
            ? `Pay the active milestone to proceed. Remaining balance: ${remainingBalanceStr}.`
            : `60% stage milestones cleared & verified. Remaining balance: ${remainingBalanceStr}.`,
      };
    }
    return card;
  });

  // 8. Assigned Team from Design Module (assigned designer + manager — never hardcoded Seher)
  const designerName = lead.designerName || lead.designer_name;
  const designerEmail = lead.designerEmail || lead.designer_email;
  const team: AssignedTeam = {
    relationshipManager: lead.assignee
      ? {
          role: 'Relationship Manager',
          name: lead.assignee,
          phone: lead.assigneePhone || undefined,
          email: lead.assigneeEmail || undefined,
        }
      : undefined,
    designer: designerName
      ? {
          role: 'Interior Designer',
          name: designerName,
          phone: lead.designerPhone || undefined,
          email: designerEmail || undefined,
        }
      : undefined,
    designManager: lead.designManagerName
      ? {
          role: 'Design Manager',
          name: lead.designManagerName,
          email: lead.designManagerEmail || undefined,
        }
      : undefined,
  };

  return {
    profile,
    metrics,
    journeySteps,
    upcomingActions: upcomingActions.slice(0, 3),
    actionCards,
    team,
    paymentSummary,
    isLiveBackend: isLive,
    leadId: fallbackLeadId,
    lastUpdated: new Date().toISOString(),
  };
}
