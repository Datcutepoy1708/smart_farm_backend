import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class ChatDto {
  @IsNumber()
  @IsNotEmpty()
  barnId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;
}
