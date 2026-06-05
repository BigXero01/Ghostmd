'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { GlassCard } from '@/components/ui/glass-card';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'text-green', PENDING: 'text-bone/60', PROCESSING: 'text-purple', FAILED: 'text-red', REFUNDED: 'text-bone/40',
};

export function DepositHistoryTable() {
  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ['deposits'],
    queryFn: async () => { const { data } = await api.get('/deposits'); return data; },
  });

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-4 border-b border-purple/10">
        <h3 className="font-heading text-xs tracking-widest text-bone/60">DEPOSIT HISTORY</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b border-purple/10">
              <th className="text-left p-4 label-ghost">DATE</th>
              <th className="text-right p-4 label-ghost">AMOUNT</th>
              <th className="text-right p-4 label-ghost">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="text-center p-8 text-bone/30">Loading...</td></tr>
            ) : deposits.length === 0 ? (
              <tr><td colSpan={3} className="text-center p-8 text-bone/30">No deposits yet</td></tr>
            ) : deposits.map((d: any) => (
              <tr key={d.id} className="border-b border-purple/5 hover:bg-purple/5 transition-colors">
                <td className="p-4 text-bone/60">{format(new Date(d.createdAt), 'MMM d, yyyy HH:mm')}</td>
                <td className="p-4 text-right text-bone">${parseFloat(d.amountUsd).toFixed(2)}</td>
                <td className={cn('p-4 text-right text-xs uppercase tracking-wider', STATUS_COLORS[d.status] || 'text-bone/40')}>{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
