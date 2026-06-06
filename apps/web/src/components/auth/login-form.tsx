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
import { SocialAuthButtons } from '@/components/auth/social-auth-buttons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      toast.success('Welcome back, phantom.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard glow>
        <h1 className="font-heading text-2xl font-semibold text-center mb-2 tracking-widest">ACCESS VAULT</h1>
        <p className="text-bone/40 text-sm text-center mb-8 font-mono">Enter your credentials to continue</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label-ghost block mb-2">EMAIL</label>
            <input {...register('email')} type="email" className="input-ghost" placeholder="phantom@ghostmd.io" />
            {errors.email && <p className="text-red text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label-ghost block mb-2">PASSWORD</label>
            <div className="relative">
              <input {...register('password')} type={showPw ? 'text' : 'password'} className="input-ghost pr-10" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-bone/30 hover:text-bone/60">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div className="flex justify-end">
            <Link href="/auth/forgot-password" className="text-purple/60 hover:text-purple text-xs font-mono transition-colors">Forgot password?</Link>
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'AUTHENTICATING...' : 'ENTER VAULT'}
          </button>
        </form>
        <SocialAuthButtons />
        <p className="text-center text-bone/30 text-sm mt-6 font-mono">
          No vault?{' '}<Link href="/auth/register" className="text-purple hover:text-purple/80 transition-colors">Create one</Link>
        </p>
      </GlassCard>
    </motion.div>
  );
}
