'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { GlassCard } from '@/components/ui/glass-card';
import { api } from '@/lib/api';
import { Loader2, ArrowLeft } from 'lucide-react';

const schema = z.object({ email: z.string().email('Invalid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/forgot-password', data);
      toast.success('If an account exists, a reset link has been sent.');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard glow>
        <h1 className="font-heading text-2xl font-semibold text-center mb-2 tracking-widest">RESET PASSWORD</h1>
        <p className="text-bone/40 text-sm text-center mb-8 font-mono">Enter your email to receive a reset link</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label-ghost block mb-2">EMAIL</label>
            <input {...register('email')} type="email" className="input-ghost" placeholder="phantom@ghostmd.io" />
            {errors.email && <p className="text-red text-xs mt-1">{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'SENDING...' : 'SEND RESET LINK'}
          </button>
        </form>
        <Link href="/auth/login" className="flex items-center gap-2 justify-center mt-6 text-bone/30 hover:text-bone text-xs font-mono transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to login
        </Link>
      </GlassCard>
    </motion.div>
  );
}
