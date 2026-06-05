'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { Activity } from 'lucide-react';

const FEED_MESSAGES = [
  { type: 'signal', text: 'SIGNAL: BTC/ETH/USDT triangular arb +0.28% detected' },
  { type: 'trade', text: 'EXEC: BUY 0.142 BTC @ $65,420 on Binance' },
  { type: 'trade', text: 'EXEC: SELL 0.142 BTC @ $65,435 on OKX' },
  { type: 'epoch', text: 'EPOCH #4821 COMPLETE: ROI +0.31% | 14 trades | 78% win' },
  { type: 'signal', text: 'SIGNAL: ETH momentum 4H breakout score 0.87' },
  { type: 'risk', text: 'RISK: Drawdown 2.1% — within safe parameters' },
  { type: 'trade', text: 'EXEC: BUY 2.45 ETH @ $3,519 on Bybit' },
  { type: 'signal', text: 'SIGNAL: Cross-exchange delta SOL/USDT +0.41%' },
];

const TYPE_COLORS: Record<string, string> = {
  signal: 'text-purple', trade: 'text-green', epoch: 'text-bone', risk: 'text-red',
};

export function TerminalFeed() {
  const [lines, setLines] = useState<{ id: number; type: string; text: string; ts: string }[]>([]);

  useEffect(() => {
    let idx = 0, counter = 0;
    const add = () => {
      const msg = FEED_MESSAGES[idx % FEED_MESSAGES.length];
      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      setLines((prev) => [{ id: counter++, type: msg.type, text: msg.text, ts: now }, ...prev].slice(0, 12));
      idx++;
    };
    add();
    const id = setInterval(add, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-purple/10">
        <Activity className="w-4 h-4 text-purple" />
        <span className="font-heading text-xs tracking-widest text-bone/60">ALGO FEED — LIVE</span>
        <motion.div className="w-1.5 h-1.5 rounded-full bg-green ml-auto"
          animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
      </div>
      <div className="p-4 space-y-1 h-64 overflow-hidden font-mono text-xs">
        <AnimatePresence>
          {lines.map((line) => (
            <motion.div key={line.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
              <span className="text-bone/20 shrink-0">{line.ts}</span>
              <span className={TYPE_COLORS[line.type] || 'text-bone/60'}>{line.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
