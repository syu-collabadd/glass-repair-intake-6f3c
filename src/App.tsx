import React, { useEffect, useState, useCallback } from 'react';
import type { Lead } from './lib/types';
import { api } from './lib/api';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { LeadQueue } from './components/LeadQueue';
import { LeadDetail } from './components/LeadDetail';

type AuthState = 'checking' | 'required' | 'ok';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const { required, valid } = await api.checkAuth();
      if (!required) {
        setAuthState('ok');
      } else if (valid) {
        setAuthState('ok');
      } else {
        setAuthState('required');
      }
    } catch {
      setAuthState('required');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const loadLeads = useCallback(async () => {
    if (authState !== 'ok') return;
    setLoading(true);
    try {
      const data = await api.getLeads();
      setLeads(data);
    } catch (err: unknown) {
      if (err instanceof Error && 'status' in err && (err as { status: number }).status === 401) {
        setAuthState('required');
      }
    } finally {
      setLoading(false);
    }
  }, [authState]);

  useEffect(() => {
    if (authState !== 'ok') return;
    loadLeads();
    const interval = setInterval(loadLeads, 5000);
    return () => clearInterval(interval);
  }, [authState, loadLeads]);

  function handleLogin(token: string) {
    void token; // already stored in sessionStorage by Login component
    setAuthState('ok');
  }

  function handleLogout() {
    sessionStorage.removeItem('dashboardToken');
    setAuthState('required');
    setLeads([]);
    setSelectedId(null);
  }

  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (authState === 'required') {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout onLogout={handleLogout}>
      <div className="flex h-full">
        {/* Queue panel */}
        <div
          className={`${
            selectedId ? 'hidden md:flex md:w-80 lg:w-96' : 'flex flex-1 md:w-80 lg:w-96'
          } flex-col border-r border-slate-200 bg-slate-50`}
        >
          <LeadQueue
            leads={leads}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={loading}
          />
        </div>

        {/* Detail panel */}
        {selectedId ? (
          <div className="flex-1 flex flex-col">
            <LeadDetail
              leadId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-slate-300 flex-col gap-3">
            <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Select a lead to view details</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
