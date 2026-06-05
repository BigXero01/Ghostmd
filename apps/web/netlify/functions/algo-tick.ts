import { PrismaClient } from '@prisma/client';
import type { Config } from '@netlify/functions';

// Simulates one minute of trading activity and persists it so the
// /api/algo/feed polling endpoint has live data to return.

const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'];
const BASE_PRICES: Record<string, number> = {
  'BTC/USDT': 65000,
  'ETH/USDT': 3500,
  'SOL/USDT': 180,
  'BNB/USDT': 580,
};
const SIGNAL_TYPES = ['triangular_arb', 'cross_exchange_delta', 'momentum_4h'];

export default async function handler() {
  const prisma = new PrismaClient();

  try {
    const events: Array<{ type: string; symbol?: string; data: object }> = [];

    // Always emit one trade per tick.
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const base = BASE_PRICES[symbol];
    const price = base * (1 + (Math.random() - 0.5) * 0.004);
    const side = Math.random() > 0.5 ? 'buy' : 'sell';
    const qty = parseFloat((Math.random() * 0.5 + 0.01).toFixed(4));

    events.push({
      type: 'trade',
      symbol,
      data: { side, symbol, price: parseFloat(price.toFixed(2)), qty, timestamp: Date.now() },
    });

    // 35% chance of a signal per tick.
    if (Math.random() < 0.35) {
      const sigSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      events.push({
        type: 'signal',
        symbol: sigSymbol,
        data: {
          type: SIGNAL_TYPES[Math.floor(Math.random() * SIGNAL_TYPES.length)],
          symbol: sigSymbol,
          confidence: parseFloat((0.6 + Math.random() * 0.35).toFixed(3)),
          timestamp: Date.now(),
        },
      });
    }

    await prisma.algoEvent.createMany({ data: events });

    // Keep only the last hour of trade/signal events to avoid unbounded growth.
    await prisma.algoEvent.deleteMany({
      where: {
        type: { in: ['trade', 'signal'] },
        createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export const config: Config = {
  schedule: '* * * * *',
};
