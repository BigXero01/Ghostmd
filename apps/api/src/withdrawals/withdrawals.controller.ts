import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  async requestWithdrawal(@Request() req: any, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalsService.requestWithdrawal(req.user.id, dto.amountUsd);
  }

  @Get()
  async getWithdrawals(@Request() req: any) {
    return this.withdrawalsService.getWithdrawals(req.user.id);
  }
}
