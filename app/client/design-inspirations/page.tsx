'use client';

import React, { Suspense, useState } from 'react';
import {
  ClientDashboardProvider,
  useClientDashboard,
} from '@/lib/client/ClientDashboardContext';
import ClientSidebar from '@/components/client/layout/ClientSidebar';
import ClientHeader from '@/components/client/layout/ClientHeader';
import ClientFooter from '@/components/client/layout/ClientFooter';
import ContactRmModal from '@/components/client/dashboard/ContactRmModal';
import FloatingSupportChat from '@/components/client/dashboard/FloatingSupportChat';

interface InspirationItem {
  id: string;
  room: string;
  style: string;
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
}

function DesignInspirationsContent() {
  const { data, isLoading, openContactModal } = useClientDashboard();
  const profile = data.profile;
  const team = data.team;

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [savedPins, setSavedPins] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const inspirations: InspirationItem[] = [
    {
      id: 'insp-1',
      room: 'living',
      style: 'Japandi & Warm Minimalist',
      title: 'Curved Wallpaper Arch with Brass TV Backing',
      description: 'Suspended TV unit with fluted oak accents, micro-cement backdrop, and concealed warm LED strip lighting.',
      imageUrl: '/images/projects/living-dining-r0.jpg',
      tags: ['Living Room', 'TV Unit', 'Fluted Oak', 'Warm LED'],
    },
    {
      id: 'insp-2',
      room: 'kitchen',
      style: 'Modern Contemporary',
      title: 'Dual-Tone Ceramic & Jet Black Quartz Kitchen',
      description: 'Upper loft units in pristine ceramic matte finish, lower base units in slate grey, with integrated chimney hood.',
      imageUrl: '/images/projects/kitchen-r0.jpg',
      tags: ['Modular Kitchen', 'Quartz Countertop', 'Ceramic Matte'],
    },
    {
      id: 'insp-3',
      room: 'bedroom',
      style: 'Luxury Scandinavian',
      title: 'Floor-to-Ceiling Oak Veneer Wardrobe with Profile Handles',
      description: 'Full-height 9-foot wardrobe with loft integration, inner motion-sensor warm LED lights, and vanity mirror table.',
      imageUrl: '/images/projects/master-bedroom-r0.jpg',
      tags: ['Master Bedroom', 'Oak Veneer', 'Floor-to-Ceiling'],
    },
    {
      id: 'insp-4',
      room: 'bedroom',
      style: 'Modern Functional',
      title: 'Integrated Study Nook & Fluted Glass Storage',
      description: 'Compact study ledge in pine wood finish, open display cubbies, and dual-drawer pedestal unit.',
      imageUrl: '/images/projects/guest-bedroom-r0.jpg',
      tags: ['Kids & Guest', 'Study Desk', 'Tandem Drawers'],
    },
    {
      id: 'insp-5',
      room: 'kitchen',
      style: 'Minimalist Linear',
      title: 'Handleless Gola Profile Rental Kitchenette',
      description: 'Sleek acrylic finish with aluminium finger-pull channels and splashback subway tiles.',
      imageUrl: '/images/projects/kitchen-r0.jpg',
      tags: ['Rental Kitchen', 'Gola Profile', 'Soft-Close'],
    },
    {
      id: 'insp-6',
      room: 'living',
      style: 'Contemporary Chic',
      title: 'Open Dining & Foyer Jaali Partition',
      description: 'CNC-cut geometric jaali divider separating foyer and dining area with ambient downlights.',
      imageUrl: '/images/projects/living-dining-r0.jpg',
      tags: ['CNC Jaali', 'Foyer Divider', 'Dining Area'],
    },
  ];

  const filteredInspirations = selectedCategory === 'all'
    ? inspirations
    : inspirations.filter((item) => item.room === selectedCategory);

  const toggleSavePin = (id: string, title: string) => {
    const isNowSaved = !savedPins[id];
    setSavedPins((prev) => ({ ...prev, [id]: isNowSaved }));
    if (isNowSaved) {
      setToastMsg(`Saved "${title}" to your project board for Designer ${team?.designer?.name || 'Seher'}`);
    } else {
      setToastMsg(`Removed from project board`);
    }
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-gray-900 font-sans flex">
      <ClientSidebar />

      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <ClientHeader />

        <main className="flex-1 px-8 sm:px-10 py-8 max-w-[1440px] w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-[0.18em]">
                  MOODBOARDS & INSPIRATIONS
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Curated for {profile?.propertyType || '3 BHK Apartment'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
                Design Inspirations
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                Explore curated finishes, carpentry layouts, and color palettes. Save ideas to share with Designer {team?.designer?.name || 'Seher'}.
              </p>
            </div>

            <button
              type="button"
              onClick={openContactModal}
              className="bg-black hover:bg-zinc-800 text-white font-extrabold text-xs px-5 py-3 rounded-full transition-all shrink-0 self-start sm:self-auto flex items-center gap-2"
            >
              <span>Discuss with Designer Seher</span>
            </button>
          </div>

          {/* Toast Notification */}
          {toastMsg && (
            <div className="fixed bottom-8 right-8 z-50 bg-black text-white text-xs font-bold px-5 py-3 rounded-full shadow-2xl animate-fade-in">
              {toastMsg}
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
            {[
              { id: 'all', label: 'All Moodboards' },
              { id: 'living', label: 'Living & Dining' },
              { id: 'kitchen', label: 'Modular Kitchen' },
              { id: 'bedroom', label: 'Bedrooms & Wardrobes' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:text-black border border-black/[0.04]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Pinterest-like Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredInspirations.map((item) => {
              const isSaved = Boolean(savedPins[item.id]);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[28px] overflow-hidden shadow-sm border border-black/[0.04] flex flex-col justify-between hover:shadow-lg transition-all group"
                >
                  <div className="relative h-60 overflow-hidden bg-gray-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {item.style}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSavePin(item.id, item.title)}
                      className={`absolute top-3 right-3 p-2.5 rounded-full text-xs font-bold transition-all shadow-md ${
                        isSaved
                          ? 'bg-[#DC2626] text-white ring-2 ring-white'
                          : 'bg-white/90 hover:bg-white text-black'
                      }`}
                      title={isSaved ? 'Saved to board' : 'Save to board'}
                    >
                      {isSaved ? '♥ Saved' : '♡ Save'}
                    </button>
                  </div>

                  <div className="p-6 space-y-3">
                    <h3 className="text-base font-extrabold text-gray-950 group-hover:text-[#DC2626] transition-colors leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="bg-[#FAF7F2] text-gray-600 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-gray-200/60"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-2 flex items-center justify-between text-xs border-t border-gray-100/80">
                    <span className="text-[11px] text-gray-400 font-medium">
                      Purva Palm Beach Spec
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSavePin(item.id, item.title)}
                      className={`font-bold transition-colors ${
                        isSaved ? 'text-[#DC2626]' : 'text-black hover:underline'
                      }`}
                    >
                      {isSaved ? '✓ Added to Designer Brief' : '+ Add to Brief'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <ClientFooter />
        </main>

        <FloatingSupportChat />
        <ContactRmModal />
      </div>
    </div>
  );
}

export default function DesignInspirationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientDashboardProvider>
        <DesignInspirationsContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
