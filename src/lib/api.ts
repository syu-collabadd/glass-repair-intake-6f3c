import type { Lead, LeadDetail } from './types';

function getToken(): string {
  return sessionStorage.getItem('dashboardToken') || '';
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'Request failed'), { status: res.status });
  }
  return res.json();
}

export const api = {
  checkAuth(): Promise<{ required: boolean; valid?: boolean }> {
    return fetch('/api/auth/check', { headers: authHeaders() }).then(r => r.json());
  },

  getLeads(): Promise<Lead[]> {
    return apiFetch('/api/leads');
  },

  getLead(id: string): Promise<LeadDetail> {
    return apiFetch(`/api/leads/${id}`);
  },

  reply(id: string, body: string): Promise<{ success: boolean; sid: string }> {
    return apiFetch(`/api/leads/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  mediaUrl(sid: string): string {
    return `/api/media/${sid}`;
  },

  mediaHeaders(): Record<string, string> {
    return authHeaders();
  },
};
