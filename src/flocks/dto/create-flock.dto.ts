import { IsInt, Min, IsOptional, IsString } from 'class-validator';

export class CreateFlockDto {
  @IsInt()
  barnId: number;

  @IsInt()
  @Min(1)
  initialCount: number;

  @IsOptional()
  @IsString()
  batchCode?: string;
}
