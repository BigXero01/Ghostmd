'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Ghost, Shield, Zap, Lock, Activity } from 'lucide-react';
import { TickerBar } from '@/components/ui/ticker-bar';
import { ScanlineOverlay } from '@/components/layout/scanline';
import { GlassCard } from '@/components/ui/glass-card';
import { TerminalFeed } from '@/components/landing/terminal-feed';
import { RoiProjectionsPanel } from '@/components/landing/roi-projections-panel';
import { DepositFormSection } from '@/components/landing/deposit-form-section';

const STATS = [
  { label: 'TOTAL VOLUME', value: '$48.2M', sub: 'processed to date' },
  { label: 'WIN RATE', value: '73.4%', sub: 'epoch average' },
  { label: 'UPTIME', value: '99.97%', sub: 'last 12 months' },
  { label: 'ACTIVE VAULTS', value: '1,247', sub: 'live portfolios' },
];

const FEATURES = [
  { icon: Zap, title: 'Algo-Driven Execution', desc: 'Triangular arbitrage, cross-exchange delta, and 4H momentum signals fire 24/7 without emotion or delay.' },
  { icon: Shield, title: 'Risk Engine', desc: '15% max drawdown kill-switch, 3x leverage cap, and automated position sizing protect your capital.' },
  { icon: Lock, title: 'PCI DSS Compliant', desc: 'Payments processed entirely by Stripe. GhostMD never touches your card data.' },
  { icon: Activity, title: 'Live Telemetry', desc: 'Real-time WebSocket feed streams every trade, signal, and epoch result directly to your terminal.' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-ink dot-grid-bg">
      <ScanlineOverlay />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />

      <nav className="fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-lg border-b border-purple/20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ghost className="w-6 h-6 text-purple" />
            <span className="font-display text-xl text-purple text-glow-purple tracking-wider">GHOST<span className="text-bone/60">MD</span></span>
          </div>
          <Link href="/dashboard" className="btn-primary text-sm py-2 px-4">ENTER VAULT</Link>
        </div>
      </nav>

      <div className="pt-16">
        <TickerBar />
      </div>

      <section className="pt-16 pb-16 px-4 max-w-7xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="font-subheading italic text-purple/80 text-lg mb-4 tracking-wide">— Phantom Markets Division —</p>
          <h1 className="font-display text-5xl md:text-7xl font-black text-bone text-glow-purple leading-tight mb-6">GHOSTMD</h1>
          <p className="font-heading text-bone/60 text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            Algorithmic crypto trading that operates in the shadows. Your capital compounds every 6 hours through multi-exchange arbitrage and momentum strategies.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard" className="btn-primary text-base px-8 py-4">ENTER THE VAULT</Link>
            <Link href="#how-it-works" className="btn-ghost text-base px-8 py-4">HOW IT WORKS</Link>
          </div>
        </motion.div>

        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}>
          {STATS.map((s) => (
            <GlassCard key={s.label} className="text-center py-6">
              <p className="font-heading text-2xl font-semibold text-purple mb-1">{s.value}</p>
              <p className="label-ghost">{s.label}</p>
              <p className="text-bone/30 text-xs mt-1">{s.sub}</p>
            </GlassCard>
          ))}
        </motion.div>
      </section>

      <section id="how-it-works" className="py-16 px-4 max-w-7xl mx-auto">
        <h2 className="font-heading text-3xl font-semibold text-center text-bone mb-12 tracking-widest">HOW THE ENGINE WORKS</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}>
                <GlassCard className="flex gap-4">
                  <div className="p-3 rounded-xl bg-purple/10 border border-purple/20 shrink-0 h-fit">
                    <Icon className="w-6 h-6 text-purple" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-bone mb-2 tracking-wider">{f.title}</h3>
                    <p className="text-bone/50 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <TerminalFeed />
          <RoiProjectionsPanel />
        </div>
      </section>

      <section id="deposit" className="py-16 px-4 max-w-2xl mx-auto">
        <DepositFormSection />
      </section>

      <footer className="border-t border-purple/10 py-8 px-4 text-center">
        <Ghost className="w-5 h-5 text-purple/40 mx-auto mb-3" />
        <p className="text-bone/20 text-xs font-mono">
          © 2024 GhostMD — Phantom Markets Division. Trading involves significant risk. Past performance is not indicative of future results. All ROI projections are estimates only and not guaranteed.
        </p>
      </footer>
    </div>
  );
}
