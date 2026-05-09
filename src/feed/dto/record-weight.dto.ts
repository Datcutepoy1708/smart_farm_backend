import { IsNumber, IsOptional } from 'class-validator';

export class RecordWeightDto {
  /** Tổng cân nặng của các con mẫu (kg) */
  @IsNumber()
  totalWeightKg: number;

  /** Số con mang cân mẫu (mặc định 10 con) */
  @IsNumber()
  sampleCount: number;

  /** Tuổi đàn (ngày tuổi) – nếu không truyền thì lấy từ flock hiện tại */
  @IsOptional()
  @IsNumber()
  ageDays?: number;
}
