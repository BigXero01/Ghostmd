'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '@/components/ui/glass-card';
import { TrendingUp } from 'lucide-react';
import { formatUsd } from '@/lib/utils';

const PRESETS = [25, 50, 100, 250];

function buildProjections(initial: number, days: number) {
  const data = [];
  let balance = initial;
  for (let d = 0; d <= days; d++) {
    if (d > 0) balance *= Math.pow(1.0025, 4);
    data.push({ day: d, balance: parseFloat(balance.toFixed(2)) });
  }
  return data;
}

export function RoiProjectionsPanel() {
  const [amount, setAmount] = useState(100);
  const data = buildProjections(amount, 30);
  const final = data[data.length - 1].balance;
  const roi = ((final - amount) / amount) * 100;

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-purple/10">
        <TrendingUp className="w-4 h-4 text-purple" />
        <span className="font-heading text-xs tracking-widest text-bone/60">30-DAY PROJECTION</span>
        <span className="text-xs text-bone/30 ml-auto font-mono">ESTIMATE ONLY</span>
      </div>
      <div className="p-4">
        <div className="flex gap-2 mb-4">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setAmount(p)}
              className={`flex-1 py-2 text-xs font-mono rounded transition-all ${amount === p ? 'bg-purple/30 border border-purple/60 text-purple' : 'bg-surface border border-purple/10 text-bone/40 hover:border-purple/30'}`}>
              ${p}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[['DEPOSITED', formatUsd(amount), ''], ['PROJECTED', formatUsd(final), 'text-green'], ['30D ROI', `+${roi.toFixed(1)}%`, 'text-green']].map(([l, v, c]) => (
            <div key={l} className="text-center">
              <p className="label-ghost">{l}</p>
              <p className={`font-mono text-sm mt-1 ${c || 'text-bone'}`}>{v}</p>
            </div>
          ))}
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9b6dff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9b6dff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#1a1528', border: '1px solid rgba(155,109,255,0.3)', borderRadius: '8px', color: '#e8e0f0', fontSize: '11px', fontFamily: 'var(--font-jetbrains-mono)' }}
                formatter={(v: number) => [formatUsd(v), 'Balance']} labelFormatter={(l) => `Day ${l}`} />
              <Area type="monotone" dataKey="balance" stroke="#9b6dff" strokeWidth={2} fill="url(#roiGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-bone/20 text-xs text-center mt-2 font-mono">* Projections are estimates. Not financial advice.</p>
      </div>
    </GlassCard>
  );
}
