import React from 'react';
import type { Message } from '../lib/types';
import { AuthenticatedImage } from './AuthenticatedImage';

interface Props {
  messages: Message[];
  onPhotoClick?: (sid: string) => void;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function DeliveryIcon({ status }: { status: string | null }) {
  if (!status) return null;

  const failed = status === 'failed' || status === 'undelivered';
  const delivered = status === 'delivered';

  return (
    <span
      className={`text-xs ${
        failed
          ? 'text-red-500 font-medium'
          : delivered
          ? 'text-green-600'
          : 'text-slate-400'
      }`}
    >
      {failed ? `⚠ ${status}` : delivered ? '✓ delivered' : status}
    </span>
  );
}

export function MessageThread({ messages, onPhotoClick }: Props) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
        No messages yet
      </div>
    );
  }

  return (
    <div className="space-y-3 px-6 py-4">
      {messages.map(msg => {
        const isInbound = msg.direction === 'inbound';
        return (
          <div
            key={msg.id}
            className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-xs lg:max-w-sm xl:max-w-md rounded-2xl px-4 py-2.5 shadow-sm ${
                isInbound
                  ? 'bg-white border border-slate-200 rounded-tl-sm'
                  : 'bg-slate-900 text-white rounded-tr-sm'
              }`}
            >
              {/* Media attachments */}
              {msg.media.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {msg.media
                    .filter(m => m.contentType?.startsWith('image/'))
                    .map(m => (
                      <AuthenticatedImage
                        key={m.sid}
                        sid={m.sid}
                        className="w-36 h-36 object-cover rounded-lg"
                        onClick={onPhotoClick ? () => onPhotoClick(m.sid) : undefined}
                      />
                    ))}
                </div>
              )}

              {/* Body */}
              {msg.body && (
                <p
                  className={`text-sm whitespace-pre-wrap ${
                    isInbound ? 'text-slate-800' : 'text-white'
                  }`}
                >
                  {msg.body}
                </p>
              )}

              {/* Footer */}
              <div
                className={`flex items-center justify-between gap-3 mt-1 ${
                  isInbound ? 'text-slate-400' : 'text-slate-300'
                }`}
              >
                <span className="text-xs">{formatTime(msg.createdAt)}</span>
                {!isInbound && <DeliveryIcon status={msg.deliveryStatus} />}
              </div>

              {/* Delivery failure alert */}
              {msg.errorCode && (
                <p className="text-xs text-red-500 mt-1">
                  Error {msg.errorCode}: {msg.errorMessage}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
