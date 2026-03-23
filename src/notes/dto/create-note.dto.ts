import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
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
}

