'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { ScanlineOverlay } from '@/components/layout/scanline';
import { useAuthStore } from '@/stores/auth.store';
import { useWebSocket } from '@/hooks/use-websocket';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  useWebSocket();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated()) return null;

  return (
    <div className="min-h-screen bg-ink dot-grid-bg">
      <ScanlineOverlay />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <Navbar />
      <main className="pt-20 pb-12 px-4 max-w-7xl mx-auto relative z-10">{children}</main>
    </div>
  );
}
