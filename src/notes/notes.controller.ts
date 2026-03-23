import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Controller('notes')
@UseGuards(AuthGuard('jwt'))
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  /** GET /api/notes */
  @Get()
  async getAll(@Request() req: any) {
    const data = await this.notesService.getAll(req.user.userId);
    return { success: true, data };
  }

  /** POST /api/notes */
  @Post()
  async create(@Body() dto: CreateNoteDto, @Request() req: any) {
    const data = await this.notesService.create(req.user.userId, dto);
    return { success: true, data };
  }

  /** PUT /api/notes/:id */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateNoteDto>,
    @Request() req: any,
  ) {
    const data = await this.notesService.update(id, req.user.userId, dto);
    return { success: true, data };
  }

  /** DELETE /api/notes/:id */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.notesService.remove(id, req.user.userId);
    return { success: true };
  }
}

