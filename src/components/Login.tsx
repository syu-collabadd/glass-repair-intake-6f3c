import React, { useState } from 'react';

interface Props {
  onLogin: (token: string) => void;
}

export function Login({ onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/check', {
        headers: { Authorization: `Bearer ${password}` },
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem('dashboardToken', password);
        onLogin(password);
      } else {
        setError('Incorrect password. Try again.');
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="mb-6">
          <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Glass Repair Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Enter your operator password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Dashboard password"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2 px-4 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
