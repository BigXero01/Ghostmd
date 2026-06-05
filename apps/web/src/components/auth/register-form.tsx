'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const schema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email('Invalid email'),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, { message: 'Must contain uppercase, lowercase, number, and special character' }),
});
type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/register', data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      toast.success('Vault initialized. Welcome to the phantom network.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard glow>
        <h1 className="font-heading text-2xl font-semibold text-center mb-2 tracking-widest">INITIALIZE VAULT</h1>
        <p className="text-bone/40 text-sm text-center mb-8 font-mono">Create your phantom account</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-ghost block mb-2">FIRST NAME</label>
              <input {...register('firstName')} className="input-ghost" placeholder="Ghost" />
              {errors.firstName && <p className="text-red text-xs mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label-ghost block mb-2">LAST NAME</label>
              <input {...register('lastName')} className="input-ghost" placeholder="Rider" />
              {errors.lastName && <p className="text-red text-xs mt-1">{errors.lastName.message}</p>}
            </div>
          </div>
          <div>
            <label className="label-ghost block mb-2">EMAIL</label>
            <input {...register('email')} type="email" className="input-ghost" placeholder="phantom@ghostmd.io" />
            {errors.email && <p className="text-red text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label-ghost block mb-2">PASSWORD</label>
            <div className="relative">
              <input {...register('password')} type={showPw ? 'text' : 'password'} className="input-ghost pr-10" placeholder="Min 8 chars, mixed case + symbol" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-bone/30 hover:text-bone/60">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red text-xs mt-1">{errors.password.message}</p>}
          </div>
          <p className="text-bone/30 text-xs font-mono">By registering you acknowledge that crypto trading carries significant risk. Projected returns are estimates only.</p>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'INITIALIZING...' : 'OPEN VAULT'}
          </button>
        </form>
        <p className="text-center text-bone/30 text-sm mt-6 font-mono">
          Already a phantom?{' '}<Link href="/auth/login" className="text-purple hover:text-purple/80 transition-colors">Log in</Link>
        </p>
      </GlassCard>
    </motion.div>
  );
}
