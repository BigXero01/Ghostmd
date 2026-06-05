import { Module } from '@nestjs/common';
import { CompoundingService } from './compounding.service';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { AlgoModule } from '../algo/algo.module';

@Module({
  imports: [PortfolioModule, AlgoModule],
  providers: [CompoundingService],
})
export class CompoundingModule {}
