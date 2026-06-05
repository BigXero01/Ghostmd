'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Ghost, LayoutDashboard, Terminal, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useWsStore } from '@/stores/ws.store';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const NAV_LINKS = [
  { href: '/dashboard', label: 'VAULT', icon: LayoutDashboard },
  { href: '/dashboard/terminal', label: 'TERMINAL', icon: Terminal },
  { href: '/settings', label: 'SETTINGS', icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, refreshToken } = useAuthStore();
  const { connected } = useWsStore();
  const router = useRouter();

  const handleLogout = async () => {
    try { await api.post('/auth/logout', { refreshToken }); } catch {}
    logout();
    router.push('/');
    toast.success('Disconnected from the phantom network');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-lg border-b border-purple/20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Ghost className="w-6 h-6 text-purple animate-pulse-glow" />
          <span className="font-display text-lg text-purple text-glow-purple tracking-wider">
            GHOST<span className="text-bone/60">MD</span>
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-heading tracking-widest transition-all duration-200',
                    active ? 'bg-purple/20 text-purple border border-purple/30' : 'text-bone/50 hover:text-bone/80 hover:bg-purple/10')}>
                  <Icon className="w-3.5 h-3.5" />{link.label}
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3">
          {connected && (
            <div className="flex items-center gap-2 text-xs text-green">
              <motion.div className="w-1.5 h-1.5 rounded-full bg-green"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              LIVE
            </div>
          )}
          {user && (
            <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-bone/40 hover:text-red transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
