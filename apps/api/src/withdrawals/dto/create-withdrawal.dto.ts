import { IsNumber, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber()
  @Min(25)
  amountUsd!: number;
}
