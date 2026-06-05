'use client';

import { useWsStore } from '@/stores/ws.store';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { Activity, Zap, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TerminalPage() {
  const { trades, signals, lastEpoch, connected } = useWsStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-bone tracking-wider">ALGO TERMINAL</h1>
          <p className="text-bone/30 text-sm font-mono mt-1">Live engine telemetry feed</p>
        </div>
        <div className={cn('flex items-center gap-2 text-sm font-mono', connected ? 'text-green' : 'text-red')}>
          <motion.div className={cn('w-2 h-2 rounded-full', connected ? 'bg-green' : 'bg-red')}
            animate={connected ? { opacity: [1, 0.3, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }} />
          {connected ? 'CONNECTED' : 'DISCONNECTED'}
        </div>
      </div>

      {lastEpoch && (
        <GlassCard glow className="flex items-center gap-6">
          <Zap className="w-6 h-6 text-purple shrink-0" />
          <div>
            <p className="label-ghost mb-1">LAST EPOCH</p>
            <p className="text-bone font-mono text-sm">
              ROI <span className="text-green font-semibold">+{(lastEpoch.roi * 100).toFixed(4)}%</span> · Epoch {lastEpoch.epochId}
            </p>
          </div>
        </GlassCard>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {[
          { icon: Activity, title: 'EXECUTED TRADES', items: trades, emptyMsg: 'Awaiting trades...', renderItem: (t: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-2 rounded hover:bg-purple/5 text-xs font-mono">
              <span className={cn('font-semibold uppercase', t.side === 'buy' ? 'text-green' : 'text-red')}>{t.side}</span>
              <span className="text-bone">{t.symbol}</span>
              <span className="text-bone/40 ml-auto">${t.price?.toLocaleString()}</span>
            </motion.div>
          ), count: trades.length },
          { icon: Shield, title: 'SIGNALS DETECTED', items: signals, emptyMsg: 'Scanning markets...', renderItem: (s: any, i: number) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-2 rounded hover:bg-purple/5 text-xs font-mono">
              <span className="text-purple font-semibold uppercase">{s.type?.replace(/_/g, ' ')}</span>
              <span className="text-bone">{s.symbol}</span>
              <span className="text-bone/40 ml-auto">{(s.confidence * 100)?.toFixed(0)}%</span>
            </motion.div>
          ), count: signals.length },
        ].map(({ icon: Icon, title, items, emptyMsg, renderItem, count }) => (
          <GlassCard key={title} className="p-0 overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b border-purple/10">
              <Icon className="w-4 h-4 text-purple" />
              <span className="font-heading text-xs tracking-widest text-bone/60">{title}</span>
              <span className="ml-auto text-xs text-bone/30 font-mono">{count}</span>
            </div>
            <div className="h-80 overflow-y-auto p-2 space-y-1">
              <AnimatePresence>
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-bone/30 text-sm font-mono">{emptyMsg}</div>
                ) : items.map(renderItem)}
              </AnimatePresence>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
