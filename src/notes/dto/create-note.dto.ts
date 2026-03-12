import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { NoteTag } from '../entities/note.entity';

export class CreateNoteDto {
  @IsOptional()
  @IsNumber()
  barnId?: number;

  @IsOptional()
  @IsNumber()
  flockId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(NoteTag)
  tag?: NoteTag = NoteTag.ROUTINE;

  @IsOptional()
  @IsDateString()
  reminderAt?: string;
}
