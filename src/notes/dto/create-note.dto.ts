import { IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { NoteTag } from '../entities/note.entity';

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(NoteTag)
  tag?: NoteTag;

  @IsOptional()
  @IsNumber()
  barnId?: number;

  @IsOptional()
  @IsNumber()
  flockId?: number;

  @IsOptional()
  @IsDateString()
  reminderAt?: string | null;
}
