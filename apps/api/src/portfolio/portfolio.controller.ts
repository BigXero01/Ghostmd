import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  async getPortfolio(@Request() req: any) {
    return this.portfolioService.getPortfolio(req.user.id);
  }

  @Get('history')
  async getHistory(@Request() req: any) {
    return this.portfolioService.getHistory(req.user.id);
  }

  @Get('projections')
  async getProjections(@Request() req: any) {
    return this.portfolioService.getProjections(req.user.id);
  }
}
