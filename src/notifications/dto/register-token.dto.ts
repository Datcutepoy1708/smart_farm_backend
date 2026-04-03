import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsString()
  deviceName?: string;
}
