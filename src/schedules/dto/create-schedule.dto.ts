import { IsInt, IsNotEmpty, IsString, Matches, IsOptional, IsArray, ArrayNotEmpty, IsIn } from 'class-validator';

export class CreateScheduleDto {
  @IsInt()
  @IsNotEmpty()
  barnId: number;

  @IsInt()
  @IsNotEmpty()
  deviceId: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: 'scheduledTime must be in HH:MM format' })
  scheduledTime: string;

  @IsInt()
  @IsOptional()
  durationSeconds?: number = 30;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsIn([1, 2, 3, 4, 5, 6, 7], { each: true, message: 'Days of week must be between 1 (Monday) and 7 (Sunday)' })
  daysOfWeek: number[];

  @IsInt()
  @IsOptional()
  feedAmountGram?: number;
}
