import { IsString } from 'class-validator';

export class ConfirmDepositDto {
  @IsString()
  paymentIntentId: string;
}
