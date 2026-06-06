import { Injectable } from '@nestjs/common';

export interface RiskMetrics {
  currentDrawdown: number;
  maxDrawdown: number;
  leverage: number;
  positionCount: number;
  exposureUsd: number;
  killSwitchActive: boolean;
}

@Injectable()
export class RiskEngineService {
  private metrics: RiskMetrics = {
    currentDrawdown: 0,
    maxDrawdown: 0,
    leverage: 1.2,
    positionCount: 3,
    exposureUsd: 12500,
    killSwitchActive: false,
  };

  getMetrics(): RiskMetrics {
    return this.metrics;
  }

  checkKillSwitch(drawdown: number): boolean {
    if (drawdown >= 0.15) {
      this.metrics.killSwitchActive = true;
      return true;
    }
    return false;
  }

  updateDrawdown(drawdown: number) {
    this.metrics.currentDrawdown = drawdown;
    this.metrics.maxDrawdown = Math.max(this.metrics.maxDrawdown, drawdown);
    this.checkKillSwitch(drawdown);
  }
}
