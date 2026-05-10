import { IsInt, Min } from 'class-validator';

export class AddChickensDto {
  @IsInt()
  @Min(1)
  addCount: number;
}
