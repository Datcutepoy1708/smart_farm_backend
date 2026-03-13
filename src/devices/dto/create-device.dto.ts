import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateDeviceDto {
  @IsNumber()
  @IsNotEmpty()
  barnId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['feeder', 'water', 'fan', 'heater', 'washer'])
  @IsNotEmpty()
  deviceType: string;
}
