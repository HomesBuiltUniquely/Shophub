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
 * Convert internal CRM stages into the 8 design milestones from DesignModulephase1
 * (with KT TRANSFER replaced by BOOKING)
 */
function getAestheticClientMilestones(
  stageName?: string,
  subStageName?: string,
  totalPaidCumulative?: number,
  totalPayableAmount?: number
): {
  currentStage: string;
  stepIndex: number;
  completionPercentage: number;
  nextMilestone: string;
} {
  const s = (stageName || '').toLowerCase();
  const sub = (subStageName || '').toLowerCase();
  const combined = `${s} ${sub}`;

  // Check if already paid 60% or more (Push to production phase)
  if (
    (totalPaidCumulative && totalPayableAmount && totalPaidCumulative >= totalPayableAmount * 0.58) ||
    (totalPaidCumulative && totalPaidCumulative >= 300000)
  ) {
    return {
      currentStage: 'PUSH TO PRODUCTION',
      stepIndex: 7,
      completionPercentage: 72,
      nextMilestone: 'FACTORY DISPATCH',
    };
  }

  // 8. PUSH TO PRODUCTION
  if (
    combined.includes('push to prod') ||
    combined.includes('p2p') ||
    combined.includes('ready prod') ||
    combined.includes('in production')
  ) {
    return {
      currentStage: 'PUSH TO PRODUCTION',
      stepIndex: 7,
      completionPercentage: 100,
      nextMilestone: 'PRODUCTION IN PROGRESS',
    };
  }

  // 7. 40% PAYMENT
  if (
    combined.includes('40%') ||
    combined.includes('sign off') ||
    combined.includes('signoff') ||
    combined.includes('final design freeze')
  ) {
    return {
      currentStage: '40% PAYMENT',
      stepIndex: 6,
      completionPercentage: 88,
      nextMilestone: 'PUSH TO PRODUCTION',
    };
  }

  // 6. DQC2 (Material selection / finishes)
  if (
    combined.includes('dqc2') ||
    combined.includes('dqc 2') ||
    combined.includes('material') ||
    combined.includes('laminate')
  ) {
    return {
      currentStage: 'DQC2',
      stepIndex: 5,
      completionPercentage: 75,
      nextMilestone: '40% PAYMENT',
    };
  }

  // 5. D2 SITE MASKING
  if (combined.includes('d2') || combined.includes('masking')) {
    return {
      currentStage: 'D2 SITE MASKING',
      stepIndex: 4,
      completionPercentage: 63,
      nextMilestone: 'DQC2',
    };
  }

  // 4. 10% PAYMENT
  if (
    combined.includes('10%') ||
    combined.includes('ten percent') ||
    combined.includes('advance payment')
  ) {
    return {
      currentStage: '10% PAYMENT',
      stepIndex: 3,
      completionPercentage: 24,
      nextMilestone: 'D2 SITE MASKING',
    };
  }

  // 3. DQC1 (First Cut Design & Quotation Discussion)
  // Booked leads with quotation in progress / design meetings
  if (
    combined.includes('dqc1') ||
    combined.includes('dqc 1') ||
    combined.includes('first cut') ||
    combined.includes('quote') ||
    combined.includes('experience & design') ||
    combined.includes('decision') ||
    combined.includes('booking done') ||
    combined.includes('closed') ||
    combined.includes('install')
  ) {
    return {
      currentStage: 'DQC1',
      stepIndex: 2,
      completionPercentage: 38,
      nextMilestone: '10% PAYMENT',
    };
  }

  // 2. D1 SITE MEASUREMENT (Site measurement visit)
  if (
    combined.includes('d1') ||
    combined.includes('measurement') ||
    combined.includes('mmt') ||
    combined.includes('site visit') ||
    combined.includes('token done')
  ) {
    return {
      currentStage: 'D1 SITE MEASUREMENT',
      stepIndex: 1,
      completionPercentage: 25,
      nextMilestone: 'DQC1',
    };
  }

  // 1. BOOKING (Initial Kickoff)
  return {
    currentStage: 'BOOKING',
    stepIndex: 0,
    completionPercentage: 12,
    nextMilestone: 'D1 SITE MEASUREMENT',
  };
}

/**
 * Transform ERP data into a refined, Pinterest-aesthetic ClientDashboardData
 */
export function mapErpToDashboard(raw: RawErpData, fallbackLeadId = '1691'): ClientDashboardData {
  const isLive = Boolean(raw.lead);
  const lead = raw.lead || {};

  // Clean customer name (Default: Varnika)
  const rawName = lead.name ? lead.name.trim() : '';
  let clientName = 'Varnika';
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

  // Clean customer ID (e.g. BLR-A1691)
  const cleanId =
    lead.customerId ||
    lead.customer_id ||
    (lead.leadId || lead.lead_identifier ? `BLR-${String(lead.leadId || lead.lead_identifier).replace(/\D/g, '')}` : 'BLR-A1691');

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
    leadId: lead.leadId || lead.lead_identifier || fallbackLeadId,
    phone: lead.phoneNumber || lead.phone_number || '8755009932',
    email: lead.email || 'varnika.gupta03@yahoo.com',
  };

  // 3. Design Module 10% - 10% - 40% - 40% Milestone Payment Breakdown & Remaining Balance
  const dp = raw.designPayment;
  const isVarnika =
    clientName.toLowerCase().includes('varnika') ||
    String(fallbackLeadId).includes('1691') ||
    String(fallbackLeadId).includes('3F565') ||
    String(fallbackLeadId).includes('2341');

  const quoteNum = dp?.quoteNum || (isVarnika ? 'Q-52330-003' : 'Q-53993-001');
  const quoteId = dp?.quoteId || (lead.quoteSentInfo?.quoteId ? Number(lead.quoteSentInfo.quoteId) : (isVarnika ? 70877 : 73761));

  // Total Quotation Value (latest)
  let totalQuoteValue = isVarnika ? 535199 : 1249949;
  if (dp?.totalPayableAmount && Number(dp.totalPayableAmount) > 0) {
    totalQuoteValue = Number(dp.totalPayableAmount);
  } else if (raw.hubQuote?.totalPayableAmount && Number(raw.hubQuote.totalPayableAmount) > 0) {
    totalQuoteValue = Number(raw.hubQuote.totalPayableAmount);
  }

  // Already Paid (sales + design modules)
  let alreadyPaid = isVarnika ? 321119 : 125000;
  if (dp?.totalPaidCumulative && Number(dp.totalPaidCumulative) > 0) {
    alreadyPaid = Number(dp.totalPaidCumulative);
  }

  // 2. Stage calculation based on CRM stage and payments
  const { currentStage, stepIndex, completionPercentage, nextMilestone } =
    getAestheticClientMilestones(
      lead.stage?.milestoneStage || lead.stage?.stage,
      lead.stage?.milestoneSubStage || lead.substage,
      alreadyPaid,
      totalQuoteValue
    );

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

  let amountToCollectNow = amountToCollect10;
  let remainingBalance = remainingAfterTwentyPercent;
  let cumulativeTarget = twentyPercentTarget;
  let cumulativePercentLabel = '20% Cumulative Target (Sales 10% + Design 10%)';
  let paymentMilestoneLabel = '10% Design Advance';
  let stageNote =
    'Sales collected 10% at closure. Design module 10% payment brings the customer to 20% of the latest quotation. You can Edit the link amount lower (partial) or higher (extra advance).';

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
    `https://design.hubinterior.com/quote/${quoteId || (isVarnika ? '70877' : '75774')}`;

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
    (quoteUrl.match(/quote\/(\d+)/) ? quoteUrl.match(/quote\/(\d+)/)![1] : (isVarnika ? '70877' : '73761'));
  const quoteAuthor = lead.quoteSentInfo?.quoteSentBy || lead.assignee || (isVarnika ? 'Seher' : 'Meghana');

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

  // 8. Assigned Team
  const team: AssignedTeam = {
    relationshipManager: {
      role: 'Relationship Manager',
      name: lead.assignee || 'Sharanya',
      phone: lead.assigneePhone || '+91 87550 09932',
      email: lead.assigneeEmail || 'chitarala@hubinterior.com',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
    designer: {
      role: 'Lead Designer',
      name: lead.designerName || lead.designer_name || 'Seher',
      phone: '+91 97405 44327',
      email: 'seher@hubinterior.com',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    },
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
