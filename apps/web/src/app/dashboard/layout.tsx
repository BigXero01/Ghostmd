'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { ScanlineOverlay } from '@/components/layout/scanline';
import { useAuthStore } from '@/stores/auth.store';
import { useWebSocket } from '@/hooks/use-websocket';
import { ensureGuestSession } from '@/lib/guest';
import { Ghost } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const [ready, setReady] = useState(false);
  useWebSocket();

  // Free, open access: ensure a session exists (provisioning a guest vault on
  // first visit) rather than gating the dashboard behind a login screen.
  useEffect(() => {
    ensureGuestSession().finally(() => setReady(true));
  }, []);

  if (!isAuthenticated() && !ready) {
    return (
      <div className="min-h-screen bg-ink dot-grid-bg flex items-center justify-center">
        <Ghost className="w-8 h-8 text-purple animate-pulse-glow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink dot-grid-bg">
      <ScanlineOverlay />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <Navbar />
      <main className="pt-20 pb-12 px-4 max-w-7xl mx-auto relative z-10">{children}</main>
    </div>
  );
}
