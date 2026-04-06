import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsString,
  IsObject,
} from 'class-validator';

export class CreateDetectionDto {
  @IsNumber()
  @IsNotEmpty()
  barnId: number;

  @IsOptional()
  @IsNumber()
  flockId?: number;

  @IsNumber()
  @IsNotEmpty()
  chickenCount: number;

  @IsOptional()
  @IsNumber()
  abnormalCount: number = 0;

  @IsOptional()
  @IsObject()
  behaviors?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  confidenceAvg?: number;

  @IsOptional()
  @IsString()
  imagePath?: string;

  @IsOptional()
  @IsBoolean()
  isAbnormal: boolean = false;
}
