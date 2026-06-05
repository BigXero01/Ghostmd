'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const TICKER_DATA = [
  { symbol: 'BTC/USDT', price: 65420.5, change: 2.34 },
  { symbol: 'ETH/USDT', price: 3521.8, change: 1.12 },
  { symbol: 'SOL/USDT', price: 182.4, change: -0.87 },
  { symbol: 'BNB/USDT', price: 582.1, change: 0.45 },
  { symbol: 'ARB/USDT', price: 0.892, change: 3.21 },
  { symbol: 'OP/USDT', price: 1.743, change: -1.34 },
];

export function TickerBar() {
  const items = [...TICKER_DATA, ...TICKER_DATA, ...TICKER_DATA];
  return (
    <div className="w-full overflow-hidden bg-surface/80 border-b border-purple/10 py-2">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: [0, -50 * TICKER_DATA.length * 8] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      >
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs font-mono">
            <span className="text-bone/60">{item.symbol}</span>
            <span className="text-bone font-semibold">${item.price.toLocaleString()}</span>
            <span className={cn('flex items-center gap-0.5', item.change >= 0 ? 'text-green' : 'text-red')}>
              {item.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
