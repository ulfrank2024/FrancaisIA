'use client';
import { useState } from 'react';

export default function NewsletterForm() {
  const [email, setEmail]     = useState('');
  const [status, setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <p className="text-emerald-400 text-sm font-bold">
        ✓ Inscription confirmée ! Tu recevras les prochaines nouveautés.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full md:w-auto">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="ton@email.com"
        required
        className="flex-1 md:w-64 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap text-sm disabled:opacity-70"
      >
        {status === 'loading' ? '...' : 'S\'abonner'}
      </button>
      {status === 'error' && (
        <span className="text-red-400 text-xs self-center">Erreur, réessaye</span>
      )}
    </form>
  );
}
