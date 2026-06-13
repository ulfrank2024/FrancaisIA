'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';

const LINKS = [
  { href: '/admin/dashboard',      label: 'Vue globale',   icon: '🏠' },
  { href: '/admin/professors',     label: 'Professeurs',   icon: '👨‍🏫' },
  { href: '/admin/users',          label: 'Utilisateurs',  icon: '👥' },
  { href: '/admin/subscriptions',  label: 'Abonnements',   icon: '💳' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <nav className="bg-slate-900 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-black text-lg flex-shrink-0">
            <span className="text-yellow-400">⚡</span>
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Admin</span>
            <span className="text-slate-400 text-xs font-normal hidden sm:inline">FrançaisIA</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${pathname.startsWith(l.href) ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <span>{l.icon}</span>{l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:block">{user?.full_name}</span>
          <button onClick={() => { logout(); router.push('/'); }}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors border border-slate-700 px-3 py-1.5 rounded-lg">
            Quitter
          </button>
        </div>
      </div>
      {/* Mobile */}
      <div className="md:hidden flex border-t border-slate-800">
        {LINKS.map(l => (
          <Link key={l.href} href={l.href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-semibold
              ${pathname.startsWith(l.href) ? 'text-yellow-400 bg-white/5' : 'text-slate-500'}`}>
            <span>{l.icon}</span>
            <span className="hidden xs:inline">{l.label.split(' ')[0]}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
