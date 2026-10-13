'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QuoteInvoiceSheet from '@/components/quote-engine/QuoteInvoiceSheet';
import { readSharedQuote, saveSharedQuote, type SharedQuoteSnapshot } from '@/lib/quote/share-snapshot';

function QuoteInvoiceContent() {
  const searchParams = useSearchParams();
  const [snapshot, setSnapshot] = useState<SharedQuoteSnapshot | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const id = searchParams.get('s');
    const loaded = readSharedQuote(id);
    if (loaded?.quote) {
      setSnapshot(loaded);
      return;
    }
    if (!id) {
      setMissing(true);
      return;
    }
    let cancelled = false;
    fetch(`/api/quote/invoices/${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.invoice?.quote) {
          setSnapshot(data.invoice);
          saveSharedQuote(data.invoice, id);
        } else {
          setMissing(true);
        }
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
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
