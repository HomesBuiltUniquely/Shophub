'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Customer, Project, Room } from '@/lib/types/quote.types';

interface QuoteContextSidebarProps {
  customers: Customer[];
  selectedCustomerId: number | null;
  onSelectCustomer: (id: number) => void;

  projects: Project[];
  selectedProjectId: number | null;
  onSelectProject: (id: number) => void;
  isLoadingProjects?: boolean;

  rooms: Room[];
  selectedRoom: string;
  onSelectRoom: (roomName: string) => void;
  onAddRoom: (newRoomName: string) => void;

  selectedUnit?: string | null;
  onSelectUnit?: (unit: string | null) => void;

  validityPeriod: string;
  onValidityChange: (val: string) => void;

  internalNotes: string;
  onNotesChange: (notes: string) => void;
}

export default function QuoteContextSidebar({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  projects,
  selectedProjectId,
  onSelectProject,
  isLoadingProjects = false,
  rooms,
  selectedRoom,
  onSelectRoom,
  onAddRoom,
  selectedUnit,
  onSelectUnit,
  validityPeriod,
  onValidityChange,
  internalNotes,
  onNotesChange,
}: QuoteContextSidebarProps) {
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  const matchingClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 40);
    return customers.filter((c) => {
      const email = 'email' in c ? String((c as Customer & { email?: string }).email || '') : '';
      return c.name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
    });
  }, [customers, clientQuery]);

  const customerProjects = useMemo(() => {
    if (selectedCustomerId == null) return [];
    return projects.filter((p) => p.customerId === selectedCustomerId || p.id === selectedCustomerId);
  }, [projects, selectedCustomerId]);

  useEffect(() => {
    if (!selectedCustomer) return;
    if (!showClientResults) setClientQuery(selectedCustomer.name);
  }, [selectedCustomer, showClientResults]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!clientSearchRef.current?.contains(event.target as Node)) {
        setShowClientResults(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const runClientSearch = () => {
    setShowClientResults(true);
    if (matchingClients.length === 1) {
      onSelectCustomer(matchingClients[0].id);
      setClientQuery(matchingClients[0].name);
      setShowClientResults(false);
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      onAddRoom(newRoomName.trim());
      setNewRoomName('');
      setShowAddRoomModal(false);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-[calc(100vh-4rem-5rem)] fixed top-16 left-56 p-5 overflow-y-auto flex flex-col justify-between z-20">
      <div className="space-y-6">
        {/* Customer Context Section */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            CUSTOMER CONTEXT
          </h3>

          {/* Customer search */}
          <div className="mb-4" ref={clientSearchRef}>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              CUSTOMER
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={clientQuery}
                  onChange={(e) => {
                    setClientQuery(e.target.value);
                    setShowClientResults(true);
                  }}
                  onFocus={() => setShowClientResults(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      runClientSearch();
                    }
                    if (e.key === 'Escape') setShowClientResults(false);
                  }}
                  placeholder="Search client name"
                  className="w-full text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-md py-2 px-3 pr-2 focus:outline-none focus:ring-1 focus:ring-black shadow-xs"
                />
                {showClientResults && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {matchingClients.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-gray-400">No clients match that name.</p>
                    ) : (
                      matchingClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onSelectCustomer(c.id);
                            setClientQuery(c.name);
                            setShowClientResults(false);
                          }}
                          className={`block w-full truncate px-3 py-2 text-left text-xs ${
                            c.id === selectedCustomerId
                              ? 'bg-gray-100 font-bold text-gray-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={runClientSearch}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-xs hover:border-black hover:text-black"
                title="Search client"
                aria-label="Search client"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Active Project Dropdown */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              ACTIVE PROJECT
            </label>
            <div className="relative">
              <select
                value={selectedProjectId ?? ''}
                onChange={(e) => onSelectProject(Number(e.target.value))}
                disabled={isLoadingProjects || !selectedCustomerId}
                className={`w-full text-xs font-semibold bg-white border border-gray-200 rounded-md py-2 px-3 appearance-none focus:outline-none focus:ring-1 focus:ring-black cursor-pointer shadow-xs ${
                  isLoadingProjects ? 'text-gray-400' : 'text-gray-800'
                }`}
              >
                {isLoadingProjects ? (
                  <option value="">Loading projects...</option>
                ) : !selectedCustomerId ? (
                  <option value="">Select a client first</option>
                ) : customerProjects.length === 0 ? (
                  <option value="">No project for this client</option>
                ) : (
                  customerProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectName}
                    </option>
                  ))
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                {isLoadingProjects ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Current Room Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                CURRENT ROOM
              </label>
              {rooms.length > 0 && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  CRM Scope
                </span>
              )}
            </div>

            {/* Room selection pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {rooms.map((r) => {
                const isActive = selectedRoom.toLowerCase() === r.roomName.toLowerCase();
                return (
                  <button
                    key={r.id}
                    onClick={() => onSelectRoom(r.roomName)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      isActive
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {r.roomName}
                  </button>
                );
              })}
              {/* Add Room Button */}
              <button
                onClick={() => setShowAddRoomModal(true)}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                title="Add a room"
              >
                +
              </button>
            </div>

            {/* Units Required for the Active Room (from CRM Requirement Scope) */}
            {(() => {
              const activeRoomObj = rooms.find(
                (r) => r.roomName.toLowerCase() === selectedRoom.toLowerCase()
              ) || rooms[0];

              if (!activeRoomObj?.units || activeRoomObj.units.length === 0) {
                return null;
              }

              return (
                <div className="mt-3 p-3 bg-[#f0fdf4] rounded-lg border border-[#bbf7d0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#166534] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00C853] inline-block animate-pulse"></span>
                      UNITS REQUIRED ({activeRoomObj.units.length})
                    </span>
                    {activeRoomObj.falseCeilingRequired && (
                      <span className="text-[8px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase">
                        False Ceiling
                      </span>
                    )}
                  </div>

                  {/* Vibrant green unit chips matching Picture 1 */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {activeRoomObj.units.map((unit) => {
                      const isSelected = selectedUnit === unit;
                      return (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => onSelectUnit && onSelectUnit(isSelected ? null : unit)}
                          className={`px-3 py-1 rounded text-[11px] font-medium transition-all shadow-xs flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-[#009624] text-white ring-2 ring-emerald-400'
                              : 'bg-[#00C853] text-white hover:bg-[#00b046]'
                          }`}
                          title={onSelectUnit ? `Filter offerings by "${unit}"` : unit}
                        >
                          <span>{unit}</span>
                          {isSelected && <span className="text-[10px] font-bold">✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Specific Room Notes */}
                  {activeRoomObj.notes && (
                    <div className="pt-2 border-t border-[#dcfce7] text-[11px] text-[#14532d]">
                      <span className="font-semibold text-[#166534]">Notes:</span> {activeRoomObj.notes}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Quote Details Section */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            QUOTE DETAILS
          </h3>

          {/* Validity Period */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              VALIDITY PERIOD
            </label>
            <div className="relative">
              <select
                value={validityPeriod}
                onChange={(e) => onValidityChange(e.target.value)}
                className="w-full text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-md py-2 px-3 appearance-none focus:outline-none focus:ring-1 focus:ring-black cursor-pointer shadow-xs"
              >
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="90 Days">90 Days</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Notes (Internal) */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              NOTES (INTERNAL)
            </label>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add private notes..."
              className="w-full text-xs text-gray-800 placeholder-gray-400 bg-white border border-gray-200 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-black resize-none shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Quota Status Card (Bottom Left) */}
      <div className="pt-4">
        <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            QUOTA STATUS
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Ready for Draft</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-tight">
            All project metadata is verified and compliant.
          </p>
        </div>
      </div>

      {/* Add Room Modal */}
      {showAddRoomModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-5 max-w-xs w-full">
            <h4 className="text-sm font-bold text-gray-900 mb-3">Add New Room</h4>
            <form onSubmit={handleCreateRoom}>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="e.g. Master Bath, Dining"
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5 mb-4 focus:outline-none focus:ring-1 focus:ring-black"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-black hover:bg-gray-800 rounded-lg"
                >
                  Add Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
