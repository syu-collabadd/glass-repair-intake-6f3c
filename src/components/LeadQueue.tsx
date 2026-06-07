import React from 'react';
import type { Lead, LeadStatus } from '../lib/types';
import { StatusBadge } from './StatusBadge';

interface Props {
  leads: Lead[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return phone.slice(0, 4) + '•'.repeat(phone.length - 7) + phone.slice(-3);
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STATUS_ORDER: Record<string, number> = {
  handoff: 0,
  'ready-for-quote': 1,
  waiting: 2,
  'opted-out': 3,
};

function sortLeads(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    const ao = STATUS_ORDER[a.status ?? 'waiting'] ?? 2;
    const bo = STATUS_ORDER[b.status ?? 'waiting'] ?? 2;
    if (ao !== bo) return ao - bo;
    const at = a.updatedAt ?? a.createdAt;
    const bt = b.updatedAt ?? b.createdAt;
    return new Date(bt).getTime() - new Date(at).getTime();
  });
}

export function LeadQueue({ leads, selectedId, onSelect, loading }: Props) {
  const sorted = sortLeads(leads);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Lead Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {leads.length} lead{leads.length !== 1 ? 's' : ''} ·{' '}
              {leads.filter(l => l.status === 'ready-for-quote').length} ready for quote
            </p>
          </div>
          {loading && (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mt-3">
          {(['handoff', 'ready-for-quote', 'waiting', 'opted-out'] as LeadStatus[]).map(s => {
            const cnt = leads.filter(l => (l.status ?? 'waiting') === s).length;
            return (
              <span
                key={s}
                className="inline-flex items-center gap-1 text-xs text-slate-500"
              >
                <StatusBadge status={s} />
                <span className="font-medium">{cnt}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {sorted.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm">No leads yet</p>
            <p className="text-xs mt-1">Incoming calls will appear here</p>
          </div>
        )}

        {sorted.map(lead => (
          <button
            key={lead.id}
            onClick={() => onSelect(lead.id)}
            className={`w-full text-left px-6 py-4 hover:bg-slate-50 transition-colors ${
              selectedId === lead.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800 font-mono">
                    {maskPhone(lead.phoneNumber)}
                  </span>
                  <StatusBadge status={lead.status} />
                  {lead.status === 'handoff' && (
                    <span className="text-xs font-medium text-amber-600">⚡ Urgent</span>
                  )}
                </div>

                {(lead.suburb || lead.postcode) && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[lead.suburb, lead.postcode].filter(Boolean).join(', ')}
                  </p>
                )}

                {lead.summary && (
                  <p className="text-xs text-slate-600 mt-1 italic line-clamp-1">
                    {lead.summary}
                  </p>
                )}

                {lead.lastMessage && !lead.summary && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {lead.lastMessage}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-xs text-slate-400">
                  {timeAgo(lead.lastMessageAt ?? lead.updatedAt ?? lead.createdAt)}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  {lead.photoCount > 0 && (
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                      {lead.photoCount}
                    </span>
                  )}
                  {lead.hasLocation && (
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
