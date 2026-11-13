'use client';

import React, { useState } from 'react';
import { useClientDashboard } from '@/lib/client/ClientDashboardContext';
import { ChatBubbleIcon } from '../icons/ClientIcons';

export default function FloatingSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const { data, openContactModal } = useClientDashboard();

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      {isOpen && (
        <div className="mb-3 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-2xl shadow-2xl border border-black/10 p-4 transition-all">
          <div className="flex items-center justify-between border-b pb-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-sm text-gray-900">Project Support</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Hi {data.profile.name || 'there'}! Your Relationship Manager is available to assist you with your project journey and quotes.
          </p>
          <button
            onClick={() => {
              setIsOpen(false);
              openContactModal();
            }}
            className="w-full bg-black text-white text-xs font-semibold py-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Connect with RM
          </button>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 rounded-full bg-black text-white flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all"
        aria-label="Open support chat"
      >
        <ChatBubbleIcon className="w-6 h-6" />
      </button>
    </div>
  );
}
