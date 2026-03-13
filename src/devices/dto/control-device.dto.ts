import { IsIn, IsNotEmpty } from 'class-validator';

export class ControlDeviceDto {
  @IsNotEmpty()
  @IsIn(['ON', 'OFF'])
  action: string;
}
