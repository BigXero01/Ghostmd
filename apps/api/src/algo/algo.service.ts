import { Injectable } from '@nestjs/common';
import { SignalEngineService } from './signal-engine.service';
import { RiskEngineService } from './risk-engine.service';
import { TelemetryService } from './telemetry.service';

@Injectable()
export class AlgoService {
  constructor(
    private signalEngine: SignalEngineService,
    private riskEngine: RiskEngineService,
    private telemetry: TelemetryService,
  ) {}

  async getEpochRoi(): Promise<number> {
    return this.signalEngine.calculateEpochRoi();
  }

  async getRiskMetrics() {
    return this.riskEngine.getMetrics();
  }

  emitPortfolioUpdate(userId: string, portfolio: any) {
    this.telemetry.emitToUser(userId, 'portfolio_update', portfolio);
  }
}
