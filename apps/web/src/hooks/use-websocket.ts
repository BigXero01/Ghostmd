'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useWsStore } from '@/stores/ws.store';
import { useQueryClient } from '@tanstack/react-query';

// The original backend streamed engine telemetry over a Socket.io WebSocket.
// Netlify Functions are request/response and do not hold WebSocket
// connections, so the live algo feed is generated on the client here. This
// mirrors the synthetic signal/telemetry engine the API used and keeps the
// terminal's trade feed, signal feed, epoch banner, and LIVE indicator
// functioning while authenticated.
const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT'];
const SIGNAL_TYPES = ['TRIANGULAR_ARB', 'CROSS_EXCHANGE', 'MOMENTUM_4H'];
const EXCHANGES = ['BINANCE', 'OKX', 'BYBIT', 'COINBASE', 'KRAKEN'];

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const priceFor = (symbol: string) => {
  const base: Record<string, number> = {
    'BTC/USDT': 64000,
    'ETH/USDT': 3400,
    'SOL/USDT': 145,
    'BNB/USDT': 580,
    'XRP/USDT': 0.52,
    'ADA/USDT': 0.38,
  };
  const p = base[symbol] ?? 100;
  return parseFloat((p * (1 + (Math.random() - 0.5) * 0.02)).toFixed(p < 10 ? 4 : 2));
};

export function useWebSocket() {
  const { accessToken } = useAuthStore();
  const { setConnected, addTrade, addSignal, setLastEpoch } = useWsStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) {
      setConnected(false);
      return;
    }

    setConnected(true);

    const tradeTimer = setInterval(() => {
      const symbol = pick(SYMBOLS);
      addTrade({
        id: crypto.randomUUID(),
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        symbol,
        exchange: pick(EXCHANGES),
        price: priceFor(symbol),
        timestamp: Date.now(),
      });
    }, 2500);

    const signalTimer = setInterval(() => {
      addSignal({
        id: crypto.randomUUID(),
        type: pick(SIGNAL_TYPES),
        symbol: pick(SYMBOLS),
        exchange: pick(EXCHANGES),
        confidence: parseFloat((0.6 + Math.random() * 0.39).toFixed(2)),
        timestamp: Date.now(),
      });
    }, 4000);

    let epoch = Math.floor(Date.now() / 1000) % 100000;
    const epochTimer = setInterval(() => {
      epoch += 1;
      setLastEpoch({
        epochId: `EPOCH-${epoch}`,
        roi: parseFloat((0.0015 + Math.random() * 0.002).toFixed(6)),
        timestamp: Date.now(),
      });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    }, 30000);

    return () => {
      clearInterval(tradeTimer);
      clearInterval(signalTimer);
      clearInterval(epochTimer);
      setConnected(false);
    };
  }, [accessToken, setConnected, addTrade, addSignal, setLastEpoch, queryClient]);

  return null;
}
