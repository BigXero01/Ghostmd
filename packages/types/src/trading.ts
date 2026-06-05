export enum SignalType {
  TRIANGULAR_ARB = 'TRIANGULAR_ARB',
  CROSS_EXCHANGE = 'CROSS_EXCHANGE',
  MOMENTUM_4H = 'MOMENTUM_4H',
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export interface TradeSignal {
  id: string;
  type: SignalType;
  symbol: string;
  exchange: string;
  side: OrderSide;
  price: number;
  size: number;
  confidence: number;
  timestamp: number;
}

export interface TradeExecution {
  id: string;
  signalId: string;
  symbol: string;
  exchange: string;
  side: OrderSide;
  price: number;
  size: number;
  fee: number;
  pnl: number;
  timestamp: number;
}

export interface EpochReport {
  epochId: string;
  startTime: number;
  endTime: number;
  roi: number;
  tradesExecuted: number;
  winRate: number;
  totalPnl: number;
}

export interface RiskMetrics {
  currentDrawdown: number;
  maxDrawdown: number;
  leverage: number;
  positionCount: number;
  exposureUsd: number;
  killSwitchActive: boolean;
}
