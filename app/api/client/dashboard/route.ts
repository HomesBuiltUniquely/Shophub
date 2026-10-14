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
    let effectiveLeadId =
      paramLeadId ||
      clientUser?.leadId ||
      (!clientUser ? process.env.NEXT_PUBLIC_DEFAULT_CLIENT_LEAD_ID || null : null);

    if (effectiveLeadId && /^\d{1,3}$/.test(String(effectiveLeadId))) {
      effectiveLeadId = null;
    }

    if (
      effectiveLeadId === '99903' ||
      effectiveLeadId?.includes('99903') ||
      effectiveLeadId?.includes('KJT5T5P7EF') ||
      clientUser?.email?.toLowerCase() === 'go@hubinterior.com'
    ) {
      effectiveLeadId = '99903';
    }

    if (!clientUser && !effectiveLeadId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No client session or lead ID found.',
        },
        { status: 401 }
      );
    }

    const leadId = effectiveLeadId || '';

    const [leadRes, pipelineRes, quoteRes, paymentRes, appointmentsRes, designPaymentRes] =
      await Promise.allSettled([
        getLeadDetails(leadId, {
          email: clientUser?.email,
          phone: clientUser?.phone,
          name: clientUser?.fullName,
        }),
        getCrmPipeline(),
        getHubQuote(leadId || '0'),
        getActivePaymentLinks(leadId || '0'),
        getUpcomingAppointments(leadId || '0'),
        leadId && String(leadId).length >= 4
          ? getDesignModulePaymentSummary(leadId)
          : Promise.resolve(null),
      ]);

    const lead = leadRes.status === 'fulfilled' ? leadRes.value : null;
    const pipeline = pipelineRes.status === 'fulfilled' ? pipelineRes.value : null;
    const hubQuote = quoteRes.status === 'fulfilled' ? quoteRes.value : null;
    const paymentLink = paymentRes.status === 'fulfilled' ? paymentRes.value : null;
    const appointments = appointmentsRes.status === 'fulfilled' ? appointmentsRes.value : null;
    const designPayment = designPaymentRes.status === 'fulfilled' ? designPaymentRes.value : null;

    if (!lead && clientUser) {
      const initialData = buildClientInitialDashboard(clientUser);
      return NextResponse.json({
        success: true,
        data: initialData,
        source: 'user-profile',
      });
    }

    const dashboardData = mapErpToDashboard(
      {
        lead,
        pipeline,
        hubQuote,
        paymentLink,
        appointments: Array.isArray(appointments) ? appointments : undefined,
        designPayment: lead?.id && designPayment?.leadId && Number(designPayment.leadId) !== Number(lead.id) ? null : designPayment,
      },
      String(lead?.id || leadId)
    );

    // If a logged-in user exists, ensure their authenticated profile overrides any mock or stale CRM lead names
    if (clientUser) {
      dashboardData.profile.name = clientUser.fullName;
      dashboardData.profile.email = clientUser.email;
      dashboardData.profile.phone = clientUser.phone;
      dashboardData.profile.clientId = clientUser.clientId;
      dashboardData.profile.propertyDetails = clientUser.propertyDetails;
      dashboardData.profile.propertyType = clientUser.propertyType;
      dashboardData.profile.leadId = String(lead?.id || clientUser.leadId || leadId || '');
    }
    if (lead?.id) {
      dashboardData.leadId = String(lead.id);
      dashboardData.profile.leadId = String(lead.id);
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
      source: dashboardData.isLiveBackend ? 'project-erp' : 'fallback',
    });
  } catch (error: unknown) {
    console.error('[Client Dashboard API] Error:', error);

    // Always return valid fallback response so client UI never breaks
    const fallbackData = mapErpToDashboard({}, '');
    return NextResponse.json({
      success: true,
      data: fallbackData,
      source: 'fallback',
      warning: (error as Error).message,
    });
  }
}
