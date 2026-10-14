'use client';

import type { QuoteItemModel, QuoteModel } from '@/lib/types/quote.types';

export type QuoteInvoiceSheetProps = {
  quote: QuoteModel;
  customerName?: string;
  projectName?: string;
  validityPeriod?: string;
  issuedBy?: string;
  standalone?: boolean;
  onClose?: () => void;
  onPrint: () => void;
};

function inr(amount: number) {
  return `INR ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function validityDays(period?: string) {
  const match = String(period || '').match(/(\d+)/);
  return match ? Number(match[1]) : 30;
}

function groupItems(items: QuoteItemModel[]) {
  const grouped = new Map<string, QuoteItemModel[]>();
  for (const item of items) {
    const key = item.category || item.room || 'Offerings';
    const list = grouped.get(key) || [];
    list.push(item);
    grouped.set(key, list);
  }
  return grouped;
}

export default function QuoteInvoiceSheet({
  quote,
  customerName,
  projectName,
  validityPeriod,
  issuedBy,
  standalone = false,
  onClose,
  onPrint,
}: QuoteInvoiceSheetProps) {
  const today = new Date();
  const due = addDays(today, validityDays(validityPeriod));
  const quoteNo = quote.quoteNumber || `QTE-${today.getFullYear()}-${String(quote.id || 1).padStart(4, '0')}`;
  const customer = customerName || quote.customerName || 'Valued Customer';
  const project = projectName || quote.projectName || 'Interior project';
  const items = quote.items || [];
  const taxable = Math.max(0, (quote.subtotal || 0) - (quote.totalDiscount || 0));
  const gst = Math.round(taxable * 0.18 * 100) / 100;
  const grouped = groupItems(items);

  return (
    <div
      className={
        standalone
          ? 'min-h-screen bg-white overflow-y-auto print:overflow-visible'
          : 'fixed inset-0 z-[80] bg-black/50 overflow-y-auto print:static print:bg-white print:overflow-visible'
      }
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #hub-quote-invoice, #hub-quote-invoice * { visibility: visible !important; }
          #hub-quote-invoice {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            background: #fff !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .hub-invoice-actions { display: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="hub-invoice-actions sticky top-0 z-10 flex items-center justify-end gap-2 bg-neutral-950 px-4 py-3 print:hidden">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            Close
          </button>
        )}
        <button
          type="button"
          onClick={onPrint}
          className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-neutral-100"
        >
          Print / Save PDF
        </button>
      </div>

      <div
        id="hub-quote-invoice"
        className="mx-auto my-6 w-[210mm] max-w-full bg-white px-10 py-8 text-[#111] shadow-2xl print:my-0 print:w-full print:max-w-none print:shadow-none"
      >
        <div className="flex items-start justify-between gap-8">
          <div className="text-[12px] leading-snug">
            <div className="text-[11px] text-[#555]">Account number:</div>
            <div className="font-semibold">{quoteNo}</div>
            <div className="mt-4 text-[11px] text-[#555]">Bill to Address:</div>
            <div className="font-bold uppercase leading-tight">{customer}</div>
            <div className="mt-1">{project}</div>
            <div className="text-[#555]">ATTN: {issuedBy || 'Hub Interior'}</div>
            <div className="text-[#555]">Bengaluru, Karnataka, IN</div>
          </div>
          <div className="text-right">
            <img
              src="/images/hub-logo.png"
              alt="HUB"
              className="ml-auto mb-2 h-10 w-auto object-contain"
            />
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight">Hub Interior Statement</h1>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-[#555]">
          Email or talk to us about your Hub Interior account or quotation, visit hubinterior.com/contact-us/
        </p>

        <div className="mt-4 border border-[#e5e5e5] bg-[#f6f6f6] px-4 py-3">
          <div className="text-[15px] font-semibold">Statement Summary</div>
          <div className="mt-2 text-[12px]">
            <div>
              Statement Number: <span className="font-medium">{quoteNo.replace(/\D/g, '') || quoteNo}</span>
            </div>
            <div>Statement Date: {formatLongDate(today)}</div>
            <div className="mt-2 text-[13px] font-bold">
              TOTAL AMOUNT DUE BY {formatLongDate(due)}{' '}
              <span className="whitespace-nowrap">{inr(quote.grandTotal || 0)}</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[12px]">
          This Account Summary is for quotation <span className="font-semibold">{quoteNo}</span>, valid for{' '}
          {validityPeriod || '30 Days'}.
        </p>
        <p className="mt-3 text-[12px] leading-relaxed">
          Greetings from Hub Interior. We are writing to provide you with an account summary of the offerings selected
          for this project. Additional information about individual offering charges and your quotation history are
          available in Quote Engine.
        </p>

        <h2 className="mt-6 text-[16px] font-semibold">Summary</h2>
        <div className="mt-2 space-y-1 text-[12px]">
          <Row label="Offerings charges" value={inr(quote.subtotal || 0)} />
          <Row label="Charges" value={inr(quote.subtotal || 0)} />
          <Row
            label={`Discount${quote.discountPercentage ? ` (${quote.discountPercentage}%)` : ''}`}
            value={`-${inr(quote.totalDiscount || 0)}`}
          />
          <Row label="Estimated freight" value={inr(quote.estimatedFreight || 0)} />
          <Row label="GST" value={inr(gst)} />
          <Row label="Total for this statement" value={inr(quote.grandTotal || 0)} strong />
        </div>

        <h2 className="mt-8 text-[16px] font-semibold">Detail</h2>
        {items.length === 0 ? (
          <p className="mt-2 text-[12px] text-[#666]">No offerings have been added to this quotation yet.</p>
        ) : (
          Array.from(grouped.entries()).map(([group, groupItems]) => {
            const groupTotal = groupItems.reduce(
              (sum, item) => sum + (item.totalPrice || item.unitPrice * item.quantity),
              0
            );
            return (
              <div key={group} className="mt-4">
                <Row label={group} value={inr(groupTotal)} strong />
                {groupItems.map((item) => (
                  <div key={`${item.prodId}-${item.room}-${item.skuId || ''}`} className="ml-0">
                    <Row
                      label={`${item.offeringName}${item.skuId ? ` (${item.skuId})` : ''} · ${item.room || 'Room'} × ${item.quantity}`}
                      value={inr(item.totalPrice || item.unitPrice * item.quantity)}
                    />
                    <Row label="Charges" value={inr(item.totalPrice || item.unitPrice * item.quantity)} muted />
                  </div>
                ))}
              </div>
            );
          })
        )}

        <p className="mt-8 text-[10px] leading-relaxed text-[#666]">
          Usage and recurring charges for this statement period will be charged on confirmation of this quotation. The
          amount of your actual charges may differ from the charges shown on this page if quantities or finishes change.
          All charges and prices are in Indian Rupees.
        </p>
        <p className="mt-2 text-[10px] text-[#666]">
          Please note: this is not a GST Invoice. GST shown above is an estimate on taxable value {inr(taxable)}.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-6 py-0.5 ${muted ? 'text-[#555]' : ''}`}>
      <span className={strong ? 'font-semibold' : ''}>{label}</span>
      <span className={`whitespace-nowrap tabular-nums ${strong ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  );
}
