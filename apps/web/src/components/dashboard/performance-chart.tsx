'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { GlassCard } from '@/components/ui/glass-card';
import { formatUsd } from '@/lib/utils';
import { format } from 'date-fns';

interface SnapshotData { balance: string; snapshotAt: string; }

export function PerformanceChart({ data }: { data: SnapshotData[] }) {
  const chartData = data.map((d) => ({ date: format(new Date(d.snapshotAt), 'MMM d'), balance: parseFloat(d.balance) }));
  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-4 border-b border-purple/10">
        <h3 className="font-heading text-xs tracking-widest text-bone/60">VAULT PERFORMANCE</h3>
      </div>
      <div className="p-4 h-64">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-bone/30 text-sm font-mono">No performance data yet. Deposit to begin.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9b6dff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9b6dff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,109,255,0.1)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(232,224,240,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(232,224,240,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: '#1a1528', border: '1px solid rgba(155,109,255,0.3)', borderRadius: '8px', color: '#e8e0f0', fontSize: '11px' }}
                formatter={(v: number) => [formatUsd(v), 'Balance']} />
              <Area type="monotone" dataKey="balance" stroke="#9b6dff" strokeWidth={2} fill="url(#perfGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </GlassCard>
  );
}
