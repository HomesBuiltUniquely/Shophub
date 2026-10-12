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

interface SupportTicketItem {
  id: string;
  subject: string;
  department: string;
  assignedTo: string;
  status: 'In Progress' | 'Resolved' | 'Open';
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  lastReply: string;
}

function SupportTicketsContent() {
  const { data, isLoading, openContactModal } = useClientDashboard();
  const profile = data.profile;
  const team = data.team;

  const [tickets, setTickets] = useState<SupportTicketItem[]>([
    {
      id: 'TK-99903-02',
      subject: '10% Milestone Payment breakdown & Easebuzz payment link assistance',
      department: 'Billing & Payments',
      assignedTo: team?.relationshipManager?.name || 'Sharanya',
      status: 'In Progress',
      priority: 'High',
      createdAt: 'Today, 2:15 PM',
      lastReply: 'RM Sharanya generated the payment breakdown for ₹1,33,395.',
    },
    {
      id: 'TK-99903-01',
      subject: 'DQC1 first-cut quotation review & 3 BHK modular room scope approval',
      department: 'Design & Architecture',
      assignedTo: team?.designer?.name || 'Seher',
      status: 'Resolved',
      priority: 'Medium',
      createdAt: 'Oct 12, 2026',
      lastReply: 'Quotation Q-53993-019 approved by DQC quality cell.',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    department: 'Design & Architecture',
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    message: '',
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim()) return;

    const newTicket: SupportTicketItem = {
      id: `TK-99903-0${tickets.length + 1}`,
      subject: formData.subject,
      department: formData.department,
      assignedTo: team?.relationshipManager?.name || 'Sharanya',
      status: 'Open',
      priority: formData.priority,
      createdAt: 'Just now',
      lastReply: 'Ticket received. Assigned to project team.',
    };

    setTickets([newTicket, ...tickets]);
    setFormData({ subject: '', department: 'Design & Architecture', priority: 'Medium', message: '' });
    setIsModalOpen(false);
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
                  CLIENT HELPDESK
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Project {profile?.clientId || 'BLR-QK-KJT5T5P7EF'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
                Support & Service Desk
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                Direct communication channel with your Relationship Manager, Lead Designer, and On-site Engineers.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="bg-black hover:bg-zinc-800 text-white font-extrabold text-xs px-5 py-3 rounded-full transition-all shrink-0 self-start sm:self-auto"
            >
              + Create Support Ticket
            </button>
          </div>

          {/* Assigned Team Escalation Matrix */}
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
              Your Dedicated Project Contacts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* RM */}
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                    alt="RM"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-[10px] font-bold uppercase text-gray-400">
                      Relationship Manager
                    </div>
                    <div className="text-sm font-extrabold text-gray-950">
                      {team?.relationshipManager?.name || 'Sharanya'}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {team?.relationshipManager?.phone || '+91 87550 09932'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openContactModal}
                  className="bg-[#FAF7F2] hover:bg-[#F2ECE1] text-xs font-bold px-3 py-1.5 rounded-full text-black transition-colors"
                >
                  Call
                </button>
              </div>

              {/* Lead Designer */}
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <img
                    src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80"
                    alt="Designer"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-[10px] font-bold uppercase text-gray-400">
                      Lead Designer
                    </div>
                    <div className="text-sm font-extrabold text-gray-950">
                      {team?.designer?.name || 'Seher'}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      seher@hubinterior.com
                    </div>
                  </div>
                </div>
                <a
                  href="mailto:seher@hubinterior.com"
                  className="bg-[#FAF7F2] hover:bg-[#F2ECE1] text-xs font-bold px-3 py-1.5 rounded-full text-black transition-colors"
                >
                  Email
                </a>
              </div>

              {/* Site Engineer */}
              <div className="bg-white rounded-[24px] p-5 shadow-sm border border-black/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                    alt="Site Engineer"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="text-[10px] font-bold uppercase text-gray-400">
                      Project Engineer
                    </div>
                    <div className="text-sm font-extrabold text-gray-950">
                      Sohan
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      +91 97411 67755
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                  On-Site
                </span>
              </div>
            </div>
          </div>

          {/* Tickets List */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 shadow-sm border border-black/[0.04] mb-8">
            <h2 className="text-base font-extrabold text-gray-950 mb-5">
              Support Tickets & Activity Log
            </h2>

            <div className="space-y-4">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl border border-gray-100 hover:border-black/[0.1] transition-all bg-[#FAF7F2]/40 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-gray-500">
                        {t.id}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          t.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'In Progress'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {t.status}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {t.department}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 font-medium">
                      Created: {t.createdAt}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-gray-950">
                      {t.subject}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Latest Update: <span className="font-medium text-gray-900">{t.lastReply}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Assigned to: <strong>{t.assignedTo}</strong></span>
                    <button
                      type="button"
                      onClick={openContactModal}
                      className="font-bold text-black hover:underline"
                    >
                      Follow up with RM →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ClientFooter />
        </main>

        {/* Create Ticket Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-[32px] p-7 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-950">Create Support Ticket</h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Subject / Summary
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="E.g., Request update on site masking schedule..."
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-black outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Department
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-black outline-none bg-white"
                    >
                      <option>Design & Architecture</option>
                      <option>Billing & Payments</option>
                      <option>Site Inspection & Civil</option>
                      <option>General RM Query</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-black outline-none bg-white"
                    >
                      <option value="High">High (Immediate)</option>
                      <option value="Medium">Medium (Within 24h)</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Detailed Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Provide additional context or question for your assigned team..."
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-black outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-full text-gray-500 font-bold hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-black hover:bg-zinc-800 text-white font-bold px-5 py-2.5 rounded-full"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <FloatingSupportChat />
        <ContactRmModal />
      </div>
    </div>
  );
}

export default function SupportTicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-black border-t-transparent animate-spin" />
        </div>
      }
    >
      <ClientDashboardProvider>
        <SupportTicketsContent />
      </ClientDashboardProvider>
    </Suspense>
  );
}
