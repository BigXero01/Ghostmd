import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  // Apple only returns the user's name on the very first authorization,
  // so the web client forwards it when available.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;
}
