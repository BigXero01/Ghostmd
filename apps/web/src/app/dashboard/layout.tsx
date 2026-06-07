'use client';

import { Navbar } from '@/components/layout/navbar';
import { ScanlineOverlay } from '@/components/layout/scanline';
import { useWebSocket } from '@/hooks/use-websocket';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useWebSocket();

  return (
    <div className="min-h-screen bg-ink dot-grid-bg">
      <ScanlineOverlay />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <Navbar />
      <main className="pt-20 pb-12 px-4 max-w-7xl mx-auto relative z-10">{children}</main>
    </div>
  );
}
