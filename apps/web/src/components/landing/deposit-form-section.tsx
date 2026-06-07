'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/glass-card';
import { Shield, ArrowRight } from 'lucide-react';

const PRESETS = [25, 50, 100, 250];

export function DepositFormSection() {
  const [amount, setAmount] = useState<number>(100);
  return (
    <GlassCard glow>
      <div className="text-center mb-6">
        <h2 className="font-heading text-2xl font-semibold text-bone tracking-wider mb-2">OPEN YOUR VAULT</h2>
        <p className="text-bone/40 text-sm font-mono">Minimum deposit $25 · Compounds every 6 hours</p>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {PRESETS.map((p) => (
          <button key={p} onClick={() => setAmount(p)}
            className={`py-3 text-sm font-mono rounded-lg transition-all ${amount === p ? 'bg-purple/30 border border-purple/60 text-purple' : 'bg-surface border border-purple/10 text-bone/50 hover:border-purple/30'}`}>
            ${p}
          </button>
        ))}
      </div>
      <input type="number" placeholder="Custom amount ($25 min)" value={amount}
        onChange={(e) => setAmount(parseFloat(e.target.value) || 25)}
        className="input-ghost mb-4" min={25} />
      <Link href="/dashboard/deposit" className="btn-primary w-full flex items-center justify-center gap-2">
        START COMPOUNDING <ArrowRight className="w-4 h-4" />
      </Link>
      <div className="flex items-center gap-2 mt-4 text-bone/30 text-xs font-mono justify-center">
        <Shield className="w-3 h-3" />
        Secured by Stripe · PCI DSS Compliant · Never stores card data
      </div>
    </GlassCard>
  );
}
