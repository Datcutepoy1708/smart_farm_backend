import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { BarnStatus } from '../entities/barn.entity';

export class CreateBarnDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsEnum(BarnStatus)
  status?: BarnStatus;
}
