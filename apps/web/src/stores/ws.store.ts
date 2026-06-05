import { create } from 'zustand';

interface WsState {
  connected: boolean;
  trades: any[];
  signals: any[];
  lastEpoch: any | null;
  setConnected: (connected: boolean) => void;
  addTrade: (trade: any) => void;
  addSignal: (signal: any) => void;
  setLastEpoch: (epoch: any) => void;
}

export const useWsStore = create<WsState>((set) => ({
  connected: false,
  trades: [],
  signals: [],
  lastEpoch: null,
  setConnected: (connected) => set({ connected }),
  addTrade: (trade) => set((s) => ({ trades: [trade, ...s.trades].slice(0, 100) })),
  addSignal: (signal) => set((s) => ({ signals: [signal, ...s.signals].slice(0, 50) })),
  setLastEpoch: (epoch) => set({ lastEpoch: epoch }),
}));
