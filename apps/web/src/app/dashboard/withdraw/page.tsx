'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/glass-card';
import { api } from '@/lib/api';
import { usePortfolio } from '@/hooks/use-portfolio';
import { formatUsd } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';

const schema = z.object({
  amountUsd: z.number().min(25, 'Minimum withdrawal is $25'),
});

type FormData = z.infer<typeof schema>;

export default function WithdrawPage() {
  const queryClient = useQueryClient();
  const { data: portfolio } = usePortfolio();
  const balance = portfolio ? parseFloat(portfolio.balance) : 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/withdrawals', data);
      toast.success('Withdrawal request submitted. Processing within 24–48 hours.');
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Link href="/dashboard" className="flex items-center gap-2 text-bone/40 hover:text-bone text-sm font-mono mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Vault
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <GlassCard glow>
          <h1 className="font-heading text-2xl font-semibold text-center mb-2 tracking-widest">
            WITHDRAW FUNDS
          </h1>
          <p className="text-bone/40 text-sm text-center mb-2 font-mono">
            Available balance: <span className="text-green">{formatUsd(balance)}</span>
          </p>
          <p className="text-bone/30 text-xs text-center mb-8 font-mono">
            Processing time: 24–48 hours
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label-ghost block mb-2">AMOUNT (USD)</label>
              <input
                {...register('amountUsd', { valueAsNumber: true })}
                type="number"
                min={25}
                max={balance}
                step="0.01"
                className="input-ghost"
                placeholder="25.00"
              />
              {errors.amountUsd && <p className="text-red text-xs mt-1">{errors.amountUsd.message}</p>}
            </div>

            <p className="text-bone/30 text-xs font-mono">
              Withdrawal requests are reviewed and processed within 24–48 business hours. Funds
              will be returned to your original payment method.
            </p>

            <button type="submit" disabled={isSubmitting || balance < 25} className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSubmitting ? 'SUBMITTING...' : 'REQUEST WITHDRAWAL'}
            </button>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
}
