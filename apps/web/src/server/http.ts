// Shared HTTP helpers and response serializers for the API route handlers.
//
// The frontend (ported from a NestJS + Prisma backend) expects monetary
// fields as strings — it calls parseFloat() on them — so portfolio, deposit
// and snapshot amounts are serialized as fixed-precision strings here.
import type {
  PortfolioRecord,
  SnapshotRecord,
  DepositRecord,
  WithdrawalRecord,
  PublicUser,
} from './store';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function errorRes(message: string, status = 400): Response {
  return json({ message, statusCode: status }, status);
}

export function unauthorized(): Response {
  return errorRes('Unauthorized', 401);
}

const money = (n: number) => n.toFixed(2);

export function serializePortfolio(p: PortfolioRecord) {
  return {
    id: p.id,
    userId: p.userId,
    balance: money(p.balance),
    totalDeposited: money(p.totalDeposited),
    totalEarnings: money(p.totalEarnings),
    lastCompounded: p.lastCompounded,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function serializeSnapshot(s: SnapshotRecord) {
  return {
    id: s.id,
    portfolioId: s.portfolioId,
    balance: money(s.balance),
    snapshotAt: s.snapshotAt,
  };
}

export function serializeDeposit(d: DepositRecord) {
  return {
    id: d.id,
    userId: d.userId,
    stripePaymentIntentId: d.stripePaymentIntentId,
    amountUsd: money(d.amountUsd),
    status: d.status,
    confirmedAt: d.confirmedAt,
    createdAt: d.createdAt,
  };
}

export function serializeWithdrawal(w: WithdrawalRecord) {
  return {
    id: w.id,
    userId: w.userId,
    amountUsd: money(w.amountUsd),
    status: w.status,
    createdAt: w.createdAt,
  };
}

export function authResponse(
  user: PublicUser,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
) {
  return {
    accessToken,
    refreshToken,
    expiresIn,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      kycStatus: user.kycStatus,
    },
  };
}

// 30-day forward projection at 0.25% ROI per 6-hour epoch (4 epochs/day),
// matching the original compounding engine.
const EPOCH_ROI = 0.0025;
const EPOCHS_PER_DAY = 4;

export function computeProjections(balance: number) {
  const projections: { day: number; balance: number; earnings: number; date: string }[] = [];
  let current = balance;
  const now = new Date();
  for (let day = 1; day <= 30; day++) {
    for (let epoch = 0; epoch < EPOCHS_PER_DAY; epoch++) {
      current *= 1 + EPOCH_ROI;
    }
    const date = new Date(now);
    date.setDate(now.getDate() + day);
    projections.push({
      day,
      balance: parseFloat(current.toFixed(2)),
      earnings: parseFloat((current - balance).toFixed(2)),
      date: date.toISOString().split('T')[0],
    });
  }
  return projections;
}
