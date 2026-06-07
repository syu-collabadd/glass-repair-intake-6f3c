import React, { useState } from 'react';
import { api } from '../lib/api';

interface Props {
  leadId: string;
  disabled?: boolean;
  onSent?: () => void;
}

export function ReplyBox({ leadId, disabled, onSent }: Props) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError('');
    try {
      await api.reply(leadId, body.trim());
      setBody('');
      onSent?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  if (disabled) {
    return (
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-400 text-center">
        SMS replies are blocked — this contact has opted out.
      </div>
    );
  }

  return (
    <form onSubmit={handleSend} className="px-4 py-3 border-t border-slate-200 bg-white">
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <div className="flex gap-2 items-end">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={2}
          className="flex-1 text-sm px-3 py-2 border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="shrink-0 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-1.5">
        Operator reply — sent from your Twilio number
      </p>
    </form>
  );
}
