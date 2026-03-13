import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateFlockDto {
  @IsNumber()
  @IsNotEmpty()
  barnId: number;

  @IsString()
  @IsNotEmpty()
  batchCode: string; // VD: "BATCH-2026-001"

  @IsNumber()
  initialCount: number;

  @IsOptional()
  @IsNumber()
  currentCount?: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  expectedEndDate?: string;

  @IsOptional()
  @IsNumber()
  avgWeightKg?: number;

  @IsOptional()
  @IsNumber()
  currentAgeDays?: number;

  @IsOptional()
  @IsIn(['starter', 'grower', 'finisher'])
  currentStage?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
