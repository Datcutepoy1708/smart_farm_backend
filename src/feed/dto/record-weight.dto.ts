export class RecordWeightDto {
  /** Tổng cân nặng của các con mẫu (kg) */
  totalWeightKg: number;

  /** Số con mang cân mẫu (mặc định 10 con) */
  sampleCount: number;

  /** Tuổi đàn (ngày tuổi) – nếu không truyền thì lấy từ flock hiện tại */
  ageDays?: number;
}
