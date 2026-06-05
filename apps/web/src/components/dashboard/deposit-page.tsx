'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/glass-card';
import { StripeDepositForm } from '@/components/dashboard/stripe-deposit-form';
import { api } from '@/lib/api';
import { Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
const PRESETS = [25, 50, 100, 250];

export function DepositPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(100);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateIntent = async () => {
    if (amount < 25) return;
    setLoading(true);
    try {
      const { data } = await api.post('/deposits/intent', { amountUsd: amount });
      // Stripe path: render the card form. Otherwise the deposit was processed
      // instantly server-side — confirm to the user and return to the vault.
      if (data.clientSecret && stripePromise) {
        setClientSecret(data.clientSecret);
        setDepositId(data.depositId);
      } else {
        toast.success(`$${amount} deposited. Compounding begins next epoch.`);
        queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        queryClient.invalidateQueries({ queryKey: ['deposits'] });
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link href="/dashboard" className="flex items-center gap-2 text-bone/40 hover:text-bone text-sm font-mono mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />Back to Vault
      </Link>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard glow>
          <h1 className="font-heading text-2xl font-semibold text-center mb-2 tracking-widest">ADD FUNDS</h1>
          <p className="text-bone/40 text-sm text-center mb-8 font-mono">Minimum $25 · Compounds every 6 hours</p>

          {!clientSecret ? (
            <>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {PRESETS.map((p) => (
                  <button key={p} onClick={() => setAmount(p)}
                    className={`py-3 text-sm font-mono rounded-lg transition-all ${amount === p ? 'bg-purple/30 border border-purple/60 text-purple' : 'bg-surface border border-purple/10 text-bone/50 hover:border-purple/30'}`}>
                    ${p}
                  </button>
                ))}
              </div>
              <div className="mb-6">
                <label className="label-ghost block mb-2">CUSTOM AMOUNT</label>
                <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 25)} min={25} className="input-ghost" />
              </div>
              <button onClick={handleCreateIntent} disabled={loading || amount < 25} className="btn-primary w-full">
                {loading ? 'PREPARING...' : `DEPOSIT $${amount}`}
              </button>
            </>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#9b6dff', colorBackground: '#1a1528', colorText: '#e8e0f0', borderRadius: '8px' } } }}>
              <StripeDepositForm clientSecret={clientSecret} depositId={depositId!} amount={amount} />
            </Elements>
          )}

          <div className="flex items-center gap-2 mt-6 text-bone/30 text-xs font-mono justify-center">
            <Shield className="w-3 h-3" />PCI DSS Compliant · Powered by Stripe
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
