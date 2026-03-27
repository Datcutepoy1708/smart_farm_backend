import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { FarmAiChat, ChatRole } from './entities/farm-ai-chat.entity';
import { Barn } from '../barns/entities/barn.entity';
import { Flock } from '../flocks/entities/flock.entity';
import { EnvironmentLog } from '../environment/entities/environment-log.entity';
import { FeedCalculation } from '../feed/entities/feed-calculation.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { ChatDto } from './dto/chat.dto';
import { FeedLog } from '../feed/entities/feed-log.entity';

@Injectable()
export class FarmAiService {
  private genAI: GoogleGenerativeAI;
  private activeRequests = new Set<string>();

  constructor(
    private configService: ConfigService,
    @InjectRepository(FarmAiChat)
    private farmAiChatRepository: Repository<FarmAiChat>,
    @InjectRepository(Barn)
    private barnRepository: Repository<Barn>,
    @InjectRepository(Flock)
    private flockRepository: Repository<Flock>,
    @InjectRepository(EnvironmentLog)
    private environmentLogRepository: Repository<EnvironmentLog>,
    @InjectRepository(FeedCalculation)
    private feedCalculationRepository: Repository<FeedCalculation>,
    @InjectRepository(FeedLog)
    private feedLogRepository: Repository<FeedLog>,
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async chat(userId: number, dto: ChatDto) {
    const { barnId, message } = dto;

    // Chống spam request
    const requestKey = `${userId}-${barnId}`;
    if (this.activeRequests.has(requestKey)) {
      return {
        reply: 'Hệ thống đang xử lý tin nhắn trước của bạn, vui lòng đợi trong giây lát.',
        contextUsed: null,
      };
    }
    this.activeRequests.add(requestKey);

    try {
    // Bước 1 — Lấy context data
    const barn = await this.barnRepository.findOne({ where: { id: barnId } });
    if (!barn) {
      throw new InternalServerErrorException('Barn not found');
    }

    const flock = await this.flockRepository.findOne({
      where: { barnId: barnId },
      order: { createdAt: 'DESC' },
    });

    const envLog = await this.environmentLogRepository.findOne({
      where: { barnId: barnId },
      order: { recordedAt: 'DESC' },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const feedLogs = await this.feedLogRepository
      .createQueryBuilder('feed_logs')
      .where('feed_logs.barn_id = :barnId', { barnId })
      .andWhere('feed_logs.created_at >= :todayStart', { todayStart })
      .select('SUM(feed_logs.amount_gram)', 'totalFeed')
      .getRawOne();

    const feedToday = feedLogs?.totalFeed ? Number(feedLogs.totalFeed) : 0;

    const feedRecommended = flock
      ? await this.feedCalculationRepository.findOne({
        where: { barnId: barnId, flockId: flock.id },
        order: { calculatedAt: 'DESC' },
      })
      : null;

    const activeAlertsCount = await this.alertRepository.count({
      where: { barnId: barnId, isRead: false },
    });

    const activeAlertsList = await this.alertRepository.find({
      where: { barnId: barnId, isRead: false },
      order: { createdAt: 'DESC' },
      take: 2, // Just get some latest ones to save token space
    });

    const alertDetails = activeAlertsList.map((a) => a.message).join('; ') || 'Không có';

    // Xây dựng contextUsed object cho DB
    const contextUsed = {
      barn_name: barn.name,
      chicken_count: flock?.currentCount ?? 0,
      temperature: envLog?.temperature ?? 0,
      humidity: envLog?.humidity ?? 0,
      avg_weight: flock?.avgWeightKg ?? 0,
      age_days: flock?.currentAgeDays ?? 0,
      stage: flock?.currentStage ?? 'Unknown',
      feed_today: feedToday,
      recommended: feedRecommended?.recommendedFeedGram ?? 0,
      active_alerts: `${activeAlertsCount} (${alertDetails})`,
    };

    // Bước 2 — Lấy 4 tin nhắn gần nhất
    const historyData = await this.farmAiChatRepository.find({
      where: { userId, barnId },
      order: { createdAt: 'DESC' },
      take: 4,
    });

    const history = historyData.reverse();

    // Định nghĩa systemPrompt
    const systemPrompt = `Bạn là FarmAI - chuyên gia nông nghiệp Việt Nam.

THÔNG TIN HIỆN TẠI:
- Chuồng: ${contextUsed.barn_name}
- Số gà: ${contextUsed.chicken_count} con
- Nhiệt độ: ${contextUsed.temperature}°C | Độ ẩm: ${contextUsed.humidity}%
- Cân nặng TB: ${contextUsed.avg_weight}kg
- Tuổi: ${contextUsed.age_days} ngày (${contextUsed.stage})
- Thức ăn: ${contextUsed.feed_today}g/${contextUsed.recommended}g
- Cảnh báo: ${contextUsed.active_alerts}

NGUYÊN TẮC:
- Ngắn gọn, dễ hiểu, thực tế.
- Đề xuất hành động cụ thể.
- Tối đa 150 từ.`;

    // Bước 3 — Gọi Gemini API (chỉ dùng model primary)
    const modelName = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';

    let reply = '';
    
    try {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });

      const chatSession = model.startChat({
        history: history.map((msg) => ({
          role: msg.role === ChatRole.USER ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      });

      const result = await chatSession.sendMessage(message);
      reply = result.response.text();
    } catch (err: any) {
      console.error(`[FarmAI] Error with model ${modelName}:`, err?.message || err);
      // Bị lỗi quá tải / giới hạn API
      return {
        reply: 'Xin lỗi, trợ lý AI đang bị quá tải hoặc tạm ngưng kết nối. Vui lòng đợi trong giây lát rồi thử lại.',
        contextUsed,
      };
    }

    // Bước 4 — Lưu vào farm_ai_chats
    const userMessageEntity = this.farmAiChatRepository.create({
      userId,
      barnId,
      role: ChatRole.USER,
      content: message,
      contextData: contextUsed,
    });

    await this.farmAiChatRepository.save(userMessageEntity);

    const assistantMessageEntity = this.farmAiChatRepository.create({
      userId,
      barnId,
      role: ChatRole.ASSISTANT,
      content: reply,
      contextData: null as any,
    });

    await this.farmAiChatRepository.save(assistantMessageEntity);

    return { reply, contextUsed };
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }

  async getChatHistory(userId: number, barnId: number, limit: number = 20) {
    const history = await this.farmAiChatRepository.find({
      where: { userId, barnId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return history.reverse();
  }
}
