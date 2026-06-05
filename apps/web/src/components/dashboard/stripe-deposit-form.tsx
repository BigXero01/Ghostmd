'use client';

import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface Props { clientSecret: string; depositId: string; amount: number; }

export function StripeDepositForm({ amount }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/dashboard?deposit=success` },
        redirect: 'if_required',
      });
      if (error) {
        toast.error(error.message || 'Payment failed');
      } else {
        toast.success(`$${amount} deposited. Compounding begins next epoch.`);
        queryClient.invalidateQueries({ queryKey: ['portfolio'] });
        queryClient.invalidateQueries({ queryKey: ['deposits'] });
        router.push('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <button type="submit" disabled={loading || !stripe} className="btn-primary w-full flex items-center justify-center gap-2">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'PROCESSING...' : `CONFIRM $${amount} DEPOSIT`}
      </button>
    </form>
  );
}
