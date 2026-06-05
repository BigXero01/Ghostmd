'use client';

import { Wallet, TrendingUp, ArrowDownCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/ui/stat-card';
import { GlassCard } from '@/components/ui/glass-card';
import { PerformanceChart } from '@/components/dashboard/performance-chart';
import { DepositHistoryTable } from '@/components/dashboard/deposit-history-table';
import { usePortfolio, usePortfolioHistory } from '@/hooks/use-portfolio';
import { useAuthStore } from '@/stores/auth.store';
import { formatUsd } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: portfolio, isLoading } = usePortfolio();
  const { data: history } = usePortfolioHistory();

  const balance = portfolio ? parseFloat(portfolio.balance) : 0;
  const deposited = portfolio ? parseFloat(portfolio.totalDeposited) : 0;
  const earnings = portfolio ? parseFloat(portfolio.totalEarnings) : 0;
  const roi = deposited > 0 ? (earnings / deposited) * 100 : 0;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="font-subheading italic text-bone/40 text-sm mb-1">
          — Phantom Markets Division —
        </p>
        <h1 className="font-heading text-3xl font-semibold text-bone tracking-wider">
          VAULT OVERVIEW
        </h1>
        <p className="text-bone/30 text-sm font-mono mt-1">
          {user?.firstName} {user?.lastName} · {user?.email}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="VAULT BALANCE"
          value={isLoading ? '—' : formatUsd(balance)}
          icon={Wallet}
          trend="neutral"
        />
        <StatCard
          label="TOTAL DEPOSITED"
          value={isLoading ? '—' : formatUsd(deposited)}
          icon={ArrowDownCircle}
          trend="neutral"
        />
        <StatCard
          label="TOTAL EARNINGS"
          value={isLoading ? '—' : formatUsd(earnings)}
          icon={TrendingUp}
          trend={earnings >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="ALL-TIME ROI"
          value={isLoading ? '—' : `+${roi.toFixed(2)}%`}
          icon={Clock}
          trend="up"
          sub="Since inception"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <PerformanceChart data={history || []} />
        </div>
        <div className="space-y-4">
          <GlassCard className="text-center py-8">
            <p className="label-ghost mb-2">NEXT EPOCH</p>
            <p className="font-heading text-2xl text-purple font-semibold">~6h</p>
            <p className="text-bone/30 text-xs mt-2 font-mono">Compounds automatically</p>
          </GlassCard>
          <Link href="/dashboard/deposit" className="btn-primary w-full flex items-center justify-center">
            ADD FUNDS
          </Link>
          <Link href="/dashboard/withdraw" className="btn-ghost w-full flex items-center justify-center">
            WITHDRAW
          </Link>
        </div>
      </div>

      <DepositHistoryTable />
    </div>
  );
}
