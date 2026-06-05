import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function GlassCard({ className, glow, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn('glass-card p-6', glow && 'border-purple/40 shadow-glow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}
