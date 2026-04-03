import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { PushToken } from './entities/push-token.entity';
import { Note } from '../notes/entities/note.entity';
import { RegisterTokenDto } from './dto/register-token.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo();

  constructor(
    @InjectRepository(PushToken)
    private readonly pushTokenRepo: Repository<PushToken>,

    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,
  ) {}

  // ─── Register / Upsert Token ──────────────────────────────────────────────
  async registerToken(userId: number, dto: RegisterTokenDto): Promise<PushToken> {
    const existing = await this.pushTokenRepo.findOne({
      where: { token: dto.token },
    });

    if (existing) {
      existing.userId     = userId;
      existing.deviceName = dto.deviceName ?? existing.deviceName;
      return this.pushTokenRepo.save(existing);
    }

    const pushToken     = new PushToken();
    pushToken.userId    = userId;
    pushToken.token     = dto.token;
    pushToken.deviceName = dto.deviceName ?? null;
    return this.pushTokenRepo.save(pushToken);
  }

  // ─── Remove Token ─────────────────────────────────────────────────────────
  async removeToken(token: string): Promise<void> {
    await this.pushTokenRepo.delete({ token });
  }

  // ─── Send Push Notification ───────────────────────────────────────────────
  async sendNotification(
    userId: number,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const tokens = await this.pushTokenRepo.find({ where: { userId } });
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        sound: 'default' as const,
        title,
        body,
        data,
      }));

    if (messages.length === 0) return;

    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        this.logger.log(`📱 Đã gửi ${tickets.length} push notification tới userId=${userId}`);
      } catch (err) {
        this.logger.error('Lỗi khi gửi push notification:', err);
      }
    }
  }

  // ─── Cron: Check & Send Reminders ────────────────────────────────────────
  @Cron('* * * * *')
  async checkAndSendReminders(): Promise<void> {
    const now = new Date();

    const pendingNotes = await this.noteRepo.find({
      where: {
        reminderAt: LessThanOrEqual(now),
        isReminded: false,
        isArchived: false,
      },
    });

    for (const note of pendingNotes) {
      const notifTitle = '🔔 Nhắc nhở Smart Farm';
      const notifBody  = note.title ?? note.content.substring(0, 50);

      await this.sendNotification(note.userId, notifTitle, notifBody, {
        noteId: note.id,
        type: 'reminder',
      });

      note.isReminded = true;
      await this.noteRepo.save(note);

      this.logger.log(`📱 Đã gửi reminder cho note ${note.id}`);
    }
  }
}
