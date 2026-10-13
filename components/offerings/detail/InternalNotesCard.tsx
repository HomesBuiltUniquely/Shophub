'use client';

import { useState, useEffect } from 'react';
import { isInternalStaff } from '@/lib/auth/session';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

interface NoteItem {
  id: string;
  text: string;
  author: string;
  timeAgo: string;
}

interface InternalNotesProps {
  auditTrailDesc?: string;
  accountingCode?: string;
  allowedUsers?: string[];
  scheduleLaunch?: string;
}

export default function InternalNotesCard({
  auditTrailDesc,
  accountingCode,
  allowedUsers = [],
  scheduleLaunch,
}: InternalNotesProps) {
  const readOnly = isInternalStaff(useCurrentUser());
  const [notes, setNotes] = useState<NoteItem[]>([]);

  useEffect(() => {
    const formattedLaunch =
      scheduleLaunch && scheduleLaunch !== '—'
        ? new Date(scheduleLaunch).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Active';

    const items: NoteItem[] = [];

    if (auditTrailDesc && auditTrailDesc !== '—') {
      items.push({
        id: 'audit-1',
        text:
          accountingCode && accountingCode !== '—'
            ? `${auditTrailDesc}. ERP Accounting Code linked: ${accountingCode}.`
            : auditTrailDesc,
        author: 'System Integration',
        timeAgo: formattedLaunch,
      });
    }

    if (allowedUsers && allowedUsers.length > 0) {
      items.push({
        id: 'access-2',
        text: `Access granted to: ${allowedUsers.join(', ')}. All inventory and sales pipelines synchronized.`,
        author: 'Admin / Security',
        timeAgo: 'Active',
      });
    }

    setNotes(items);
  }, [auditTrailDesc, accountingCode, allowedUsers, scheduleLaunch]);

  const [isAdding, setIsAdding] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: NoteItem = {
      id: Date.now().toString(),
      text: newNoteText.trim(),
      author: 'You',
      timeAgo: 'Just now',
    };

    setNotes([newNote, ...notes]);
    setNewNoteText('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 tracking-tight">
          Internal Notes & Integration
        </h2>
        {!readOnly && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="w-7 h-7 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-black transition-colors"
            title="Add internal note"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Inline Add Note Input */}
      {isAdding && (
        <form onSubmit={handleAddNote} className="space-y-2 pt-1 pb-2">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Add internal team note..."
            rows={2}
            className="w-full text-xs p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none bg-gray-50/50"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
            >
              Post Note
            </button>
          </div>
        </form>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="bg-gray-50/80 rounded-xl p-4 border border-gray-100/80 space-y-2 transition-all hover:bg-gray-50"
          >
            <p className="text-xs text-gray-700 leading-relaxed">
              {note.text}
            </p>
            <div className="text-[11px] font-medium text-gray-400">
              {note.author} • {note.timeAgo}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
