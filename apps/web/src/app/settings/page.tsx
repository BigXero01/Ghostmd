'use client';

import { Navbar } from '@/components/layout/navbar';
import { ScanlineOverlay } from '@/components/layout/scanline';
import { GlassCard } from '@/components/ui/glass-card';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-ink dot-grid-bg">
      <ScanlineOverlay />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <Navbar />
      <main className="pt-20 pb-12 px-4 max-w-2xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <h1 className="font-heading text-3xl font-semibold text-bone tracking-wider">SETTINGS</h1>
          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              <Activity className="w-5 h-5 text-purple" />
              <h2 className="font-heading tracking-widest text-sm">SYSTEM</h2>
            </div>
            <div className="space-y-3 text-sm font-mono">
              {[['MODE', 'DEMO'], ['COMPOUNDING', 'EVERY 6 HOURS'], ['RISK ENGINE', 'ACTIVE']].map(([l, v]) => (
                <div key={l} className="flex justify-between py-2 border-b border-purple/10 last:border-0">
                  <span className="text-bone/40">{l}</span>
                  <span className="text-green">{v}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </main>
    </div>
  );
}
