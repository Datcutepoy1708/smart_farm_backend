import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeFeedDto {
  @IsInt()
  @IsNotEmpty()
  barnId: number;

  @IsString()
  @IsNotEmpty()
  image: string; // Base64 encoded image
}
