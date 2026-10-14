import Link from 'next/link';
import HubLogo from '@/components/brand/HubLogo';

export default function PolicyPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900">
      <header className="border-b border-black/5 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <HubLogo height={28} />
          </Link>
          <Link href="/client" className="text-xs font-semibold text-gray-500 hover:text-gray-900">
            Back to portal
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#DC2626] mb-2">Hub Interior</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-6 text-gray-600">{children}</div>
      </main>
    </div>
  );
}
