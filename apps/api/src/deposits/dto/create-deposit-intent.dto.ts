import { IsNumber, Min, Max } from 'class-validator';

export class CreateDepositIntentDto {
  @IsNumber()
  @Min(25)
  @Max(100000)
  amountUsd!: number;
}
