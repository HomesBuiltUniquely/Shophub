'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EnterpriseShell from '@/components/layout/EnterpriseShell';

type DashboardData = {
  catalog: { total: number; active: number; drafts: number; archived: number; activeShare: number };
  health: { percent: number; skuWarnings: number; missingImages: number; missingPricing: number; missingSpecs: number };
  composition: {
    products: number;
    services: number;
    packages: number;
    productShare: number;
    serviceShare: number;
    packageShare: number;
  };
  quotes: { createdMtd: number; approvedValue: number; averageValue: number; spark: number[] };
  mostUsed: {
    prodId: number;
    offering_name: string;
    sku_id: string;
    category: string;
    offering_type: string;
    selling_price: number;
    units: string;
    current_stock: number;
    primary_image: string;
    inStock: boolean;
  }[];
  recentActivity: {
    prodId: number;
    offering_name: string;
    sku_id: string;
    action: string;
    category: string;
  }[];
};

function formatInr(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function OfferingsDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard', { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (!json?.success) throw new Error(json?.error || 'Unable to load dashboard');
        setData(json);
      })
      .catch((err) => setError(err.message || 'Unable to load dashboard'));
  }, []);

  const catalog = data?.catalog || { total: 0, active: 0, drafts: 0, archived: 0, activeShare: 0 };
  const health = data?.health || { percent: 0, skuWarnings: 0, missingImages: 0, missingPricing: 0, missingSpecs: 0 };
  const composition = data?.composition || {
    products: 0,
    services: 0,
    packages: 0,
    productShare: 0,
    serviceShare: 0,
    packageShare: 0,
  };
  const quotes = data?.quotes || { createdMtd: 0, approvedValue: 0, averageValue: 0, spark: [0, 0, 0, 0, 0] };
  const sparkMax = Math.max(1, ...quotes.spark);

  return (
    <EnterpriseShell title="Dashboard" searchQuery={searchQuery} onSearchChange={setSearchQuery} placeholder="Search Offerings...">
      <main className="lg:ml-56 pt-16 p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Offerings Dashboard</h1>
            <p className="text-xs text-gray-500 mt-1">Live catalog health from your products in ShopHub.</p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Link
              href="/brands"
              className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 px-3.5 py-1.5 rounded-lg text-xs font-semibold"
            >
              Add Brand
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Metric label="Total Offerings" value={catalog.total.toLocaleString()} />
          <Metric label="Active Items" value={catalog.active.toLocaleString()} hint={`${catalog.activeShare}% total`} />
          <Metric label="Drafts" value={catalog.drafts.toLocaleString()} hint={catalog.drafts ? 'Needs review' : 'All published'} hintClass="text-amber-500" />
          <Metric label="Archived" value={catalog.archived.toLocaleString()} hint="Legacy" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200/90 p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-5 flex flex-col justify-between">
                <div>
                  <p className="font-bold text-sm text-gray-900 mb-4">Catalog Health</p>
                  <div className="flex flex-col items-center justify-center my-3">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#F3F4F6" strokeWidth="9" fill="transparent" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#000000"
                          strokeWidth="9"
                          strokeDasharray={251.3}
                          strokeDashoffset={251.3 * (1 - health.percent / 100)}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-xl font-extrabold text-gray-900">{health.percent}%</span>
                        <span className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">Ready</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-gray-400 font-medium">{health.skuWarnings} SKU warnings detected</p>
              </div>
              <div className="md:col-span-7 md:border-l border-gray-100 md:pl-6">
                <p className="font-bold text-sm text-gray-900 mb-3">Missing Data Alerts</p>
                <div className="space-y-2.5">
                  <Alert title="Missing Product Images" detail={`${health.missingImages} offerings require primary visuals`} />
                  <Alert title="Undefined Pricing" detail={`${health.missingPricing} items have no selling price`} />
                  <Alert title="Missing Specifications" detail={`${health.missingSpecs} offerings lack dimensions`} />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200/90 p-6 flex flex-col justify-between">
            <div>
              <p className="font-bold text-sm text-gray-900 mb-5">Catalog Composition</p>
              <Bar label="Products" value={composition.products} share={composition.productShare} bar="bg-black" />
              <Bar label="Services" value={composition.services} share={composition.serviceShare} bar="bg-neutral-600" />
              <Bar label="Packages" value={composition.packages} share={composition.packageShare} bar="bg-gray-300" />
            </div>
            <p className="border-t border-gray-100 pt-4 mt-6 text-xs text-gray-500">
              Packages are {composition.packageShare}% of catalog mix.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-200/90 p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quotes Created (MTD)</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-extrabold text-gray-900">{quotes.createdMtd.toLocaleString()}</span>
              <div className="flex items-end gap-1.5 h-7">
                {quotes.spark.map((n, i) => (
                  <div key={i} className={`w-2.5 rounded-xs ${n ? 'bg-black' : 'bg-gray-200'}`} style={{ height: `${Math.max(8, (n / sparkMax) * 28)}px` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200/90 p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Approved Value</p>
            <p className="text-3xl font-extrabold text-gray-900">{formatInr(quotes.approvedValue)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200/90 p-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Avg. Quote Value</p>
            <p className="text-3xl font-extrabold text-gray-900">{formatInr(quotes.averageValue)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200/90 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-sm text-gray-900">Most used offerings</span>
              <Link href="/offerings" className="text-xs font-semibold text-gray-500">View All →</Link>
            </div>
            <div className="space-y-3">
              {(data?.mostUsed || []).length === 0 && <p className="text-sm text-gray-500">No offerings yet.</p>}
              {(data?.mostUsed || []).map((item) => (
                <button
                  key={item.prodId}
                  type="button"
                  onClick={() => router.push(`/offerings/single_offering?id=${item.prodId}`)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 grid place-items-center text-[10px] font-bold">
                      {item.primary_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.primary_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        item.offering_name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{item.offering_name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {item.offering_type} › {item.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-bold text-gray-900">{formatInr(item.selling_price)}</p>
                    <p className={`text-[10px] font-bold uppercase ${item.inStock ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {item.current_stock} {item.inStock ? 'in stock' : 'low stock'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200/90 p-6">
            <p className="font-bold text-sm text-gray-900 mb-5">Recent Activity</p>
            <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-gray-100">
              {(data?.recentActivity || []).length === 0 && <p className="text-sm text-gray-500">No recent catalog changes.</p>}
              {(data?.recentActivity || []).map((event) => (
                <div key={event.prodId} className="relative">
                  <div className="absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-black bg-white" />
                  <p className="text-xs text-gray-700">
                    Offering <span className="font-bold text-gray-900">{event.offering_name}</span> was {event.action}
                    {event.sku_id ? ` · ${event.sku_id}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </EnterpriseShell>
  );
}

function Metric({ label, value, hint, hintClass = 'text-gray-400' }: { label: string; value: string; hint?: string; hintClass?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/90 p-5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-gray-900">{value}</span>
        {hint ? <span className={`text-xs font-medium ${hintClass}`}>{hint}</span> : null}
      </div>
    </div>
  );
}

function Alert({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="bg-[#FAFBFD] border border-gray-100 rounded-lg p-2.5">
      <p className="text-xs font-bold text-gray-900">{title}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{detail}</p>
    </div>
  );
}

function Bar({ label, value, share, bar }: { label: string; value: number; share: number; bar: string }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center text-xs mb-1.5">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="font-bold text-gray-900">{value.toLocaleString()}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}
