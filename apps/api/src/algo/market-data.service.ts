import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class MarketDataService implements OnModuleInit {
  private prices: Map<string, number> = new Map();

  onModuleInit() {
    this.startSimulatedFeed();
  }

  private startSimulatedFeed() {
    const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'];
    const basePrices: Record<string, number> = {
      'BTC/USDT': 65000,
      'ETH/USDT': 3500,
      'SOL/USDT': 180,
      'BNB/USDT': 580,
    };

    symbols.forEach((s) => this.prices.set(s, basePrices[s]));

    setInterval(() => {
      symbols.forEach((symbol) => {
        const current = this.prices.get(symbol) || basePrices[symbol];
        const change = (Math.random() - 0.5) * 0.002;
        this.prices.set(symbol, current * (1 + change));
      });
    }, 1000);
  }

  getPrice(symbol: string): number {
    return this.prices.get(symbol) || 0;
  }

  getAllPrices(): Record<string, number> {
    return Object.fromEntries(this.prices);
  }
}
