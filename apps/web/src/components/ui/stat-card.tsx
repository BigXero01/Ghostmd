import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ label, value, sub, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('glass-card p-5', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="label-ghost mb-2">{label}</p>
          <p className={cn('text-2xl font-heading font-semibold', trend === 'up' && 'text-green', trend === 'down' && 'text-red', !trend && 'text-bone')}>
            {value}
          </p>
          {sub && <p className="text-bone/40 text-xs mt-1 font-mono">{sub}</p>}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-purple/10 border border-purple/20">
            <Icon className="w-5 h-5 text-purple" />
          </div>
        )}
      </div>
    </div>
  );
}
