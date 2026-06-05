import { Ghost } from 'lucide-react';
import Link from 'next/link';
import { ScanlineOverlay } from '@/components/layout/scanline';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink dot-grid-bg flex flex-col items-center justify-center px-4">
      <ScanlineOverlay />
      <div className="fixed inset-0 bg-radial-glow pointer-events-none" />
      <Link href="/" className="flex items-center gap-3 mb-10 relative z-10">
        <Ghost className="w-7 h-7 text-purple" />
        <span className="font-display text-2xl text-purple text-glow-purple tracking-wider">
          GHOST<span className="text-bone/60">MD</span>
        </span>
      </Link>
      <div className="w-full max-w-md relative z-10">{children}</div>
    </div>
  );
}
