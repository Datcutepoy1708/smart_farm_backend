import { IsIn, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class ControlDeviceDto {
  @IsNotEmpty()
  @IsIn(['ON', 'OFF'])
  action: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  duration?: number;
}
