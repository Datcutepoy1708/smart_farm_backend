import { IsInt, Min } from 'class-validator';

export class MortalityDto {
  @IsInt()
  @Min(1)
  deadCount: number;
}
