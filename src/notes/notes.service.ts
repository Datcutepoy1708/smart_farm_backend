import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';

import { Note } from './entities/note.entity';
import { Barn } from '../barns/entities/barn.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    @InjectRepository(Note)
    private noteRepository: Repository<Note>,

    @InjectRepository(Barn)
    private barnRepository: Repository<Barn>,
  ) {}

  async getNotes(userId: number, barnId?: number) {
    const queryBuilder = this.noteRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.barn', 'barn')
      .where('note.userId = :userId', { userId })
      .andWhere('note.isArchived = :isArchived', { isArchived: false });

    if (barnId) {
      queryBuilder.andWhere('note.barnId = :barnId', { barnId });
    }

    queryBuilder.orderBy('note.createdAt', 'DESC');

    const notes = await queryBuilder.getMany();

    return {
      success: true,
      data: notes.map((note) => ({
        ...note,
        barnName: note.barn?.name ?? null,
      })),
    };
  }

  async getNoteById(id: number) {
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: ['barn'],
    });

    if (!note) {
      throw new NotFoundException(`Note với id ${id} không tồn tại`);
    }

    return {
      success: true,
      data: {
        ...note,
        barnName: note.barn?.name ?? null,
      },
    };
  }

  async createNote(userId: number, dto: CreateNoteDto) {
    const note = this.noteRepository.create({
      userId,
      barnId: dto.barnId,
      flockId: dto.flockId,
      title: dto.title,
      content: dto.content,
      tag: dto.tag,
      reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : undefined,
    });

    const savedNote = await this.noteRepository.save(note);

    return {
      success: true,
      data: savedNote,
    };
  }

  async updateNote(id: number, dto: UpdateNoteDto) {
    const note = await this.noteRepository.findOne({ where: { id } });

    if (!note) {
      throw new NotFoundException(`Note với id ${id} không tồn tại`);
    }

    // Cập nhật các field được truyền vào
    if (dto.barnId !== undefined) note.barnId = dto.barnId;
    if (dto.flockId !== undefined) note.flockId = dto.flockId;
    if (dto.title !== undefined) note.title = dto.title ?? '';
    if (dto.content !== undefined) note.content = dto.content;
    if (dto.tag !== undefined) note.tag = dto.tag;
    if (dto.reminderAt !== undefined) note.reminderAt = new Date(dto.reminderAt);
    if (dto.isArchived !== undefined) note.isArchived = dto.isArchived;

    const updatedNote = await this.noteRepository.save(note);

    return {
      success: true,
      data: updatedNote,
    };
  }

  async deleteNote(id: number) {
    const note = await this.noteRepository.findOne({ where: { id } });

    if (!note) {
      throw new NotFoundException(`Note với id ${id} không tồn tại`);
    }

    await this.noteRepository.remove(note);

    return {
      success: true,
      data: { message: 'Xóa thành công' },
    };
  }

  @Cron('* * * * *')
  async checkReminders() {
    const now = new Date();

    const notes = await this.noteRepository.find({
      where: {
        reminderAt: LessThanOrEqual(now),
        isReminded: false,
        isArchived: false,
      },
    });

    if (notes.length === 0) return;

    for (const note of notes) {
      const preview = note.content.length > 50
        ? note.content.substring(0, 50) + '...'
        : note.content;

      this.logger.log(`Reminder: ${note.title ?? 'Không tiêu đề'} - ${preview}`);

      note.isReminded = true;
    }

    await this.noteRepository.save(notes);
    this.logger.log(`Đã xử lý ${notes.length} reminder(s)`);
  }
}
