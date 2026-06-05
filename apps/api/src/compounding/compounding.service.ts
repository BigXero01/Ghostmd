import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PortfolioService } from '../portfolio/portfolio.service';
import { AlgoService } from '../algo/algo.service';
import { TelemetryService } from '../algo/telemetry.service';

@Injectable()
export class CompoundingService {
  private readonly logger = new Logger(CompoundingService.name);

  constructor(
    private prisma: PrismaService,
    private portfolioService: PortfolioService,
    private algoService: AlgoService,
    private telemetry: TelemetryService,
  ) {}

  @Cron('0 */6 * * *')
  async runEpoch() {
    const epochId = `epoch_${Date.now()}`;
    this.logger.log(`Starting compounding epoch ${epochId}`);

    const roi = await this.algoService.getEpochRoi();
    const portfolios = await this.prisma.portfolio.findMany({
      where: { balance: { gt: 0 } },
    });

    let succeeded = 0;
    let failed = 0;

    // Process each portfolio independently so a single failure does not
    // prevent the remaining portfolios from receiving their epoch ROI.
    await Promise.all(
      portfolios.map(async (portfolio) => {
        try {
          await this.portfolioService.applyEpochRoi(portfolio.id, roi);

          const updated = await this.prisma.portfolio.findUnique({
            where: { id: portfolio.id },
          });

          if (updated) {
            this.telemetry.emitToUser(portfolio.userId, 'epoch_complete', {
              epochId,
              roi,
              newBalance: updated.balance,
              timestamp: Date.now(),
            });
            this.telemetry.emitToUser(portfolio.userId, 'portfolio_update', updated);
          }

          succeeded++;
        } catch (err) {
          failed++;
          this.logger.error(
            `Epoch ${epochId}: failed to apply ROI to portfolio ${portfolio.id}: ${(err as Error).message}`,
          );
        }
      }),
    );

    this.logger.log(
      `Epoch ${epochId} complete. ROI: ${(roi * 100).toFixed(4)}%. ` +
        `Succeeded: ${succeeded}, Failed: ${failed}`,
    );
  }
}
