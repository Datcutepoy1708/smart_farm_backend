import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note, NoteTag } from './entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
  ) {}

  /** GET /notes — lấy tất cả ghi chú của user */
  async getAll(userId: number): Promise<Note[]> {
    return this.noteRepo.find({
      where: { userId, isArchived: false },
      order: { createdAt: 'DESC' },
    });
  }

  /** POST /notes — tạo ghi chú mới */
  async create(userId: number, dto: CreateNoteDto): Promise<Note> {
    const note = new Note();
    note.userId = userId;
    note.title = dto.title || null;
    note.content = dto.content;
    note.tag = dto.tag || NoteTag.ROUTINE;
    note.barnId = dto.barnId ?? null;
    note.flockId = dto.flockId ?? null;
    return this.noteRepo.save(note);
  }

  /** PUT /notes/:id — cập nhật ghi chú */
  async update(
    id: number,
    userId: number,
    dto: Partial<CreateNoteDto>,
  ): Promise<Note> {
    const note = await this.noteRepo.findOne({ where: { id, userId } });
    if (!note) throw new NotFoundException(`Note #${id} không tồn tại`);
    Object.assign(note, dto);
    return this.noteRepo.save(note);
  }

  /** DELETE /notes/:id — xoá (archive) ghi chú */
  async remove(id: number, userId: number): Promise<void> {
    const note = await this.noteRepo.findOne({ where: { id, userId } });
    if (!note) throw new NotFoundException(`Note #${id} không tồn tại`);
    note.isArchived = true;
    await this.noteRepo.save(note);
  }
}
