import { IsNumber, Min, Max } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(25)
  @Max(1000000)
  amountUsd: number;
}
