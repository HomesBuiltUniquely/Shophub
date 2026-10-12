'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QuoteInvoiceSheet from '@/components/quote-engine/QuoteInvoiceSheet';
import { readSharedQuote, type SharedQuoteSnapshot } from '@/lib/quote/share-snapshot';

function QuoteInvoiceContent() {
  const searchParams = useSearchParams();
  const [snapshot, setSnapshot] = useState<SharedQuoteSnapshot | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const loaded = readSharedQuote(searchParams.get('s'));
    if (loaded?.quote) {
      setSnapshot(loaded);
    } else {
      setMissing(true);
    }
  }, [searchParams]);

  if (missing) {
    return (
      <div className="min-h-screen grid place-items-center bg-white px-6 text-center">
        <p className="text-sm text-gray-500">This quotation link has expired or is not available on this device.</p>
      </div>
    );
  }

  if (!snapshot) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <QuoteInvoiceSheet
      quote={snapshot.quote}
      customerName={snapshot.customerName}
      projectName={snapshot.projectName}
      validityPeriod={snapshot.validityPeriod}
      issuedBy={snapshot.issuedBy}
      standalone
      onPrint={() => window.print()}
    />
  );
}

export default function QuoteInvoicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <QuoteInvoiceContent />
    </Suspense>
  );
}
