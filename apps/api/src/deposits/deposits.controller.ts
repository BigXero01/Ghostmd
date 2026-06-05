import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepositsService } from './deposits.service';
import { CreateDepositIntentDto } from './dto/create-deposit-intent.dto';
import { ConfirmDepositDto } from './dto/confirm-deposit.dto';

@Controller('deposits')
@UseGuards(JwtAuthGuard)
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post('intent')
  async createIntent(@Request() req: any, @Body() dto: CreateDepositIntentDto) {
    return this.depositsService.createIntent(req.user.id, dto.amountUsd);
  }

  @Post('confirm')
  async confirm(@Request() req: any, @Body() dto: ConfirmDepositDto) {
    return this.depositsService.confirmDeposit(req.user.id, dto.paymentIntentId);
  }

  @Get()
  async getDeposits(@Request() req: any) {
    return this.depositsService.getDeposits(req.user.id);
  }
}
