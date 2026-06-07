import React from 'react';
import type { LeadStatus } from '../lib/types';

const CONFIG: Record<
  LeadStatus | 'unknown',
  { label: string; cls: string }
> = {
  waiting: {
    label: 'Waiting',
    cls: 'bg-blue-100 text-blue-700 ring-1 ring-blue-300',
  },
  'ready-for-quote': {
    label: 'Ready for Quote',
    cls: 'bg-green-100 text-green-700 ring-1 ring-green-300',
  },
  handoff: {
    label: 'Handoff',
    cls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300',
  },
  'opted-out': {
    label: 'Opted Out',
    cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-300',
  },
  unknown: {
    label: 'New',
    cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-300',
  },
};

export function StatusBadge({
  status,
}: {
  status: LeadStatus | null | undefined;
}) {
  const key = (status || 'unknown') as keyof typeof CONFIG;
  const { label, cls } = CONFIG[key] ?? CONFIG.unknown;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
