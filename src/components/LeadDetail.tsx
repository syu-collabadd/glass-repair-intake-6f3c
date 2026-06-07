import React, { useEffect, useState, useCallback } from 'react';
import type { LeadDetail as LeadDetailType } from '../lib/types';
import { api } from '../lib/api';
import { StatusBadge } from './StatusBadge';
import { MessageThread } from './MessageThread';
import { ReplyBox } from './ReplyBox';
import { AuthenticatedImage } from './AuthenticatedImage';

interface Props {
  leadId: string;
  onClose: () => void;
}

export function LeadDetail({ leadId, onClose }: Props) {
  const [lead, setLead] = useState<LeadDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxSid, setLightboxSid] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getLead(leadId);
      setLead(data);
    } catch (err) {
      console.error('[detail] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !lead) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Failed to load lead.
      </div>
    );
  }

  const allPhotos = lead.messages.flatMap(m =>
    m.media.filter(a => a.contentType?.startsWith('image/'))
  );

  const deliveryFailures = lead.messages.filter(
    m => m.direction === 'outbound' &&
      (m.deliveryStatus === 'failed' || m.deliveryStatus === 'undelivered')
  );

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Queue
          </button>
          <StatusBadge status={lead.status} />
        </div>

        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-semibold text-slate-900 font-mono">
              {lead.phoneNumber}
            </p>
            {(lead.suburb || lead.postcode) && (
              <p className="text-sm text-slate-600 mt-0.5">
                📍 {[lead.suburb, lead.postcode].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div className="flex gap-3 text-xs text-slate-500">
            <span className={lead.hasPhoto ? 'text-green-600 font-medium' : 'text-slate-400'}>
              {lead.hasPhoto ? '✓ Photo' : '✗ Photo'}
            </span>
            <span className={lead.hasLocation ? 'text-green-600 font-medium' : 'text-slate-400'}>
              {lead.hasLocation ? '✓ Location' : '✗ Location'}
            </span>
          </div>
        </div>

        {/* AI summary */}
        {lead.summary && (
          <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-600 font-medium mb-0.5">AI Summary</p>
            <p className="text-sm text-blue-900">{lead.summary}</p>
          </div>
        )}

        {/* Delivery failures */}
        {deliveryFailures.length > 0 && (
          <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-medium text-red-600">
              ⚠ {deliveryFailures.length} delivery failure{deliveryFailures.length > 1 ? 's' : ''} —
              check Twilio console
            </p>
          </div>
        )}

        {/* Photo thumbnails row */}
        {allPhotos.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {allPhotos.map(photo => (
              <AuthenticatedImage
                key={photo.sid}
                sid={photo.sid}
                className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                onClick={() => setLightboxSid(photo.sid)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto">
        <MessageThread
          messages={lead.messages}
          onPhotoClick={setLightboxSid}
        />
      </div>

      {/* Reply box */}
      <ReplyBox
        leadId={lead.id}
        disabled={lead.optedOut}
        onSent={load}
      />

      {/* Lightbox */}
      {lightboxSid && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSid(null)}
        >
          <div onClick={e => e.stopPropagation()}>
            <AuthenticatedImage
              sid={lightboxSid}
              className="max-w-full max-h-screen rounded-lg"
              alt="Damage photo full size"
            />
          </div>
          <button
            onClick={() => setLightboxSid(null)}
            className="absolute top-4 right-4 text-white text-2xl font-light hover:text-slate-300"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
