import { NextRequest, NextResponse } from 'next/server';
import {
  getLeadDetails,
  getCrmPipeline,
  getHubQuote,
  getActivePaymentLinks,
  getUpcomingAppointments,
  getDesignModulePaymentSummary,
} from '@/lib/api/erp-client';
import { mapErpToDashboard } from '@/lib/client/erpMapper';
import { resolveClientUser, buildClientInitialDashboard } from '@/lib/client/userLeadResolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paramLeadId = searchParams.get('leadId');

    // 1. Resolve logged-in client from session cookies
    const clientUser = await resolveClientUser(request);

    // Determine the effective lead ID:
    // Explicit query param -> user's assigned leadId -> fallback (only if no logged-in user)
    const effectiveLeadId =
      paramLeadId ||
      clientUser?.leadId ||
      (!clientUser ? process.env.NEXT_PUBLIC_DEFAULT_CLIENT_LEAD_ID || '1691' : null);

    // If the logged-in client has no CRM lead assigned yet, show their clean personalized initial portal
    if (!effectiveLeadId && clientUser) {
      const initialData = buildClientInitialDashboard(clientUser);
      return NextResponse.json({
        success: true,
        data: initialData,
        source: 'user-profile',
      });
    }

    const leadId = effectiveLeadId || '1691';

    // Parallel fetch from project-erp and DesignModule with graceful settled error handling
    const [leadRes, pipelineRes, quoteRes, paymentRes, appointmentsRes, designPaymentRes] =
      await Promise.allSettled([
        getLeadDetails(leadId),
        getCrmPipeline(),
        getHubQuote(leadId),
        getActivePaymentLinks(leadId),
        getUpcomingAppointments(leadId),
        getDesignModulePaymentSummary(leadId),
      ]);

    const lead = leadRes.status === 'fulfilled' ? leadRes.value : null;
    const pipeline = pipelineRes.status === 'fulfilled' ? pipelineRes.value : null;
    const hubQuote = quoteRes.status === 'fulfilled' ? quoteRes.value : null;
    const paymentLink = paymentRes.status === 'fulfilled' ? paymentRes.value : null;
    const appointments = appointmentsRes.status === 'fulfilled' ? appointmentsRes.value : null;
    const designPayment = designPaymentRes.status === 'fulfilled' ? designPaymentRes.value : null;

    const dashboardData = mapErpToDashboard(
      {
        lead,
        pipeline,
        hubQuote,
        paymentLink,
        appointments: Array.isArray(appointments) ? appointments : undefined,
        designPayment,
      },
      leadId
    );

    // If a logged-in user exists, ensure their authenticated profile overrides any mock or stale CRM lead names
    if (clientUser) {
      dashboardData.profile.name = clientUser.fullName;
      dashboardData.profile.email = clientUser.email;
      dashboardData.profile.phone = clientUser.phone;
      dashboardData.profile.clientId = clientUser.clientId;
      dashboardData.profile.propertyDetails = clientUser.propertyDetails;
      dashboardData.profile.propertyType = clientUser.propertyType;
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
      source: dashboardData.isLiveBackend ? 'project-erp' : 'fallback',
    });
  } catch (error: unknown) {
    console.error('[Client Dashboard API] Error:', error);

    // Always return valid fallback response so client UI never breaks
    const fallbackData = mapErpToDashboard({}, 'AL-1002');
    return NextResponse.json({
      success: true,
      data: fallbackData,
      source: 'fallback',
      warning: (error as Error).message,
    });
  }
}
