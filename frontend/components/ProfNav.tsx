'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

const LINKS = [
  { href: '/prof/dashboard',   label: 'Vue d\'ensemble', icon: '🏠' },
  { href: '/prof/lessons',     label: 'Cours',           icon: '📚' },
  { href: '/prof/corrections', label: 'Corrections',     icon: '✏️' },
];

export default function ProfNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/prof/dashboard" className="flex items-center gap-2 font-black text-lg flex-shrink-0">
            <span className="text-red-600">🍁</span>
            <span className="text-slate-900">RéussirTCF</span>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Prof</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors
                  ${pathname.startsWith(l.href)
                    ? 'bg-red-50 text-red-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                <span>{l.icon}</span>{l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:block">{user?.full_name?.split(' ')[0]}</span>
          <button onClick={() => { logout(); router.push('/'); }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors">
            <span className="sm:hidden">↪</span>
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
      {/* Mobile nav */}
      <div className="sm:hidden flex border-t border-slate-50">
        {LINKS.map(l => (
          <Link key={l.href} href={l.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold transition-colors
              ${pathname.startsWith(l.href) ? 'text-red-700 bg-red-50' : 'text-slate-400'}`}>
            <span className="text-base">{l.icon}</span>{l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
