'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../lib/auth-context';

const LINKS = [
  { href: '/admin/dashboard',     label: 'Vue globale',    icon: '🏠' },
  { href: '/admin/professors',    label: 'Professeurs',    icon: '👨‍🏫' },
  { href: '/admin/users',         label: 'Utilisateurs',   icon: '👥' },
  { href: '/admin/subscriptions', label: 'Abonnements',    icon: '💳' },
  { href: '/admin/sondages',      label: 'Sondages',       icon: '⭐' },
  { href: '/admin/flux',          label: 'Flux',           icon: '📊' },
  { href: '/admin/preview-eo',    label: 'Aperçu EO',      icon: '🎤' },
  { href: '/admin/preview-ee',    label: 'Aperçu EE',      icon: '✍️' },
  { href: '/admin/preview-ce',    label: 'Aperçu CE',      icon: '📖' },
  { href: '/admin/bank-co',       label: 'Banque CO',      icon: '🎧' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <span className="text-xl">🍁</span>
          <div>
            <div className="font-black text-sm text-white leading-none">RéussirTCF</div>
            <div className="text-xs font-bold text-amber-400 leading-none mt-0.5">Admin</div>
          </div>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {LINKS.map(l => {
          const active = pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group
                ${active
                  ? 'bg-red-600/20 text-white border border-red-700/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <span className="text-base w-5 text-center flex-shrink-0">{l.icon}</span>
              <span>{l.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer user */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-2">
        <div className="px-3 py-2">
          <div className="text-xs font-bold text-slate-300 truncate">{user?.full_name ?? '—'}</div>
          <div className="text-xs text-slate-600 truncate">{user?.email ?? ''}</div>
        </div>
        <button onClick={() => { logout(); router.push('/'); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all">
          <span>↩</span> Quitter l'admin
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 min-h-screen sticky top-0 h-screen">
        {sidebar}
      </aside>

      {/* ── Mobile topbar ── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-black">
          <span className="text-red-500">🍁</span>
          <span className="text-sm text-white">RéussirTCF</span>
          <span className="text-xs text-amber-400 font-bold">Admin</span>
        </Link>
        <button onClick={() => setMobileOpen(v => !v)}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col">
            {sidebar}
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
