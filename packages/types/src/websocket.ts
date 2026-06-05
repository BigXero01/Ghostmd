import type { TradeExecution, EpochReport, TradeSignal } from './trading';
import type { Portfolio } from './portfolio';

export enum WsEvent {
  TRADE_EXECUTED = 'trade_executed',
  EPOCH_COMPLETE = 'epoch_complete',
  SIGNAL_DETECTED = 'signal_detected',
  PORTFOLIO_UPDATE = 'portfolio_update',
  RISK_ALERT = 'risk_alert',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface WsTradeExecuted {
  event: WsEvent.TRADE_EXECUTED;
  data: TradeExecution;
}

export interface WsEpochComplete {
  event: WsEvent.EPOCH_COMPLETE;
  data: EpochReport;
}

export interface WsSignalDetected {
  event: WsEvent.SIGNAL_DETECTED;
  data: TradeSignal;
}

export interface WsPortfolioUpdate {
  event: WsEvent.PORTFOLIO_UPDATE;
  data: Portfolio;
}

export type WsMessage = WsTradeExecuted | WsEpochComplete | WsSignalDetected | WsPortfolioUpdate;
