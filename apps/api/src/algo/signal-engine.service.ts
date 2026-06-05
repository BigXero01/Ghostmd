import { Injectable } from '@nestjs/common';

@Injectable()
export class SignalEngineService {
  async calculateEpochRoi(): Promise<number> {
    const baseRoi = 0.0025;
    const variance = (Math.random() - 0.3) * 0.001;
    return Math.max(0.001, baseRoi + variance);
  }

  detectTriangularArb(): { symbol: string; profit: number } | null {
    const random = Math.random();
    if (random > 0.85) {
      return { symbol: 'BTC/ETH/USDT', profit: random * 0.003 };
    }
    return null;
  }

  detectCrossExchangeDelta(): { symbol: string; exchange: string; delta: number } | null {
    const random = Math.random();
    if (random > 0.9) {
      return { symbol: 'ETH/USDT', exchange: 'binance', delta: random * 0.005 };
    }
    return null;
  }

  detectMomentum4h(): { symbol: string; direction: 'long' | 'short'; score: number } | null {
    const random = Math.random();
    if (random > 0.7) {
      return {
        symbol: 'BTC/USDT',
        direction: random > 0.85 ? 'long' : 'short',
        score: random,
      };
    }
    return null;
  }
}
