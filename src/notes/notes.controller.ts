import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface RequestUser {
  userId: number;
  email: string;
}

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async getNotes(
    @CurrentUser() user: RequestUser,
    @Query('barn_id') barnId?: string,
  ) {
    const parsedBarnId = barnId ? parseInt(barnId, 10) : undefined;
    return this.notesService.getNotes(user.userId, parsedBarnId);
  }

  @Get(':id')
  async getNoteById(@Param('id', ParseIntPipe) id: number) {
    return this.notesService.getNoteById(id);
  }

  @Post()
  async createNote(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateNoteDto,
  ) {
    return this.notesService.createNote(user.userId, dto);
  }

  @Patch(':id')
  async updateNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.updateNote(id, dto);
  }

  @Delete(':id')
  async deleteNote(@Param('id', ParseIntPipe) id: number) {
    return this.notesService.deleteNote(id);
  }
}
