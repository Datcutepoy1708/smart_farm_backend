import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { YoloDetectionLog } from './entities/yolo-detection-log.entity';
import { CreateDetectionDto } from './dto/create-detection.dto';
import { AlertsService } from '../alerts/alerts.service';
import { EventsGateway } from '../gateway/events.gateway';

interface DetectionStats {
  avgChickenCount: number;
  totalDetections: number;
  abnormalRate: number;
  maxAbnormalCount: number;
  hourlyData: HourlyDataPoint[];
}

interface HourlyDataPoint {
  hour: string;
  chickenCount: number;
  isAbnormal: boolean;
}

interface DailyDataPoint {
  date: string;
  avgCount: number;
  abnormalCount: number;
  abnormalRate: number;
}

@Injectable()
export class CameraService {
  private readonly logger = new Logger(CameraService.name);

  constructor(
    @InjectRepository(YoloDetectionLog)
    private detectionRepository: Repository<YoloDetectionLog>,
    private alertsService: AlertsService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * Lấy bản ghi detection mới nhất của barnId
   */
  async getLatestDetection(
    barnId: number,
  ): Promise<YoloDetectionLog | null> {
    return this.detectionRepository.findOne({
      where: { barnId },
      order: { recordedAt: 'DESC' },
    });
  }

  /**
   * Thống kê detection trong N giờ gần nhất
   */
  async getDetectionStats(
    barnId: number,
    hours: number = 24,
  ): Promise<DetectionStats> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const records = await this.detectionRepository.find({
      where: {
        barnId,
        recordedAt: MoreThanOrEqual(since),
      },
      order: { recordedAt: 'ASC' },
    });

    const totalDetections = records.length;

    if (totalDetections === 0) {
      return {
        avgChickenCount: 0,
        totalDetections: 0,
        abnormalRate: 0,
        maxAbnormalCount: 0,
        hourlyData: [],
      };
    }

    const totalChickens = records.reduce((sum, r) => sum + r.chickenCount, 0);
    const avgChickenCount = Math.round(totalChickens / totalDetections);

    const abnormalDetections = records.filter((r) => r.isAbnormal).length;
    const abnormalRate = Math.round((abnormalDetections / totalDetections) * 100);

    const maxAbnormalCount = records.reduce(
      (max, r) => Math.max(max, r.abnormalCount),
      0,
    );

    // Group by giờ trong ngày (HH:00)
    const hourlyMap = new Map<string, YoloDetectionLog[]>();
    for (const record of records) {
      const hour = record.recordedAt.getHours().toString().padStart(2, '0') + ':00';
      const existing = hourlyMap.get(hour) ?? [];
      existing.push(record);
      hourlyMap.set(hour, existing);
    }

    const hourlyData: HourlyDataPoint[] = Array.from(hourlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, recs]) => {
        const avgCount = Math.round(
          recs.reduce((sum, r) => sum + r.chickenCount, 0) / recs.length,
        );
        const hasAbnormal = recs.some((r) => r.isAbnormal);
        return { hour, chickenCount: avgCount, isAbnormal: hasAbnormal };
      });

    return {
      avgChickenCount,
      totalDetections,
      abnormalRate,
      maxAbnormalCount,
      hourlyData,
    };
  }

  /**
   * Lịch sử detection với phân trang đơn giản
   */
  async getDetectionHistory(
    barnId: number,
    limit: number = 20,
  ): Promise<YoloDetectionLog[]> {
    return this.detectionRepository.find({
      where: { barnId },
      order: { recordedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Thống kê theo ngày trong N ngày gần nhất
   */
  async getDetectionByDay(
    barnId: number,
    days: number = 7,
  ): Promise<DailyDataPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const records = await this.detectionRepository.find({
      where: {
        barnId,
        recordedAt: MoreThanOrEqual(since),
      },
      order: { recordedAt: 'ASC' },
    });

    // Group by date (YYYY-MM-DD)
    const dailyMap = new Map<string, YoloDetectionLog[]>();
    for (const record of records) {
      const date = record.recordedAt.toISOString().split('T')[0];
      const existing = dailyMap.get(date) ?? [];
      existing.push(record);
      dailyMap.set(date, existing);
    }

    return Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, recs]) => {
        const avgCount = Math.round(
          recs.reduce((sum, r) => sum + r.chickenCount, 0) / recs.length,
        );
        const abnormalCount = recs.filter((r) => r.isAbnormal).length;
        const abnormalRate = Math.round((abnormalCount / recs.length) * 100);
        return { date, avgCount, abnormalCount, abnormalRate };
      });
  }

  /**
   * Lưu kết quả YOLO mới, emit alert + socket nếu cần
   */
  async createDetection(
    dto: CreateDetectionDto,
  ): Promise<YoloDetectionLog> {
    const detection = this.detectionRepository.create({
      barnId: dto.barnId,
      chickenCount: dto.chickenCount,
      abnormalCount: dto.abnormalCount ?? 0,
      behaviors: dto.behaviors ?? null,
      confidenceAvg: dto.confidenceAvg ?? null,
      imagePath: dto.imagePath ?? null,
      isAbnormal: dto.isAbnormal ?? false,
    });

    const saved = await this.detectionRepository.save(detection);

    // Tạo alert nếu phát hiện bất thường
    if (dto.isAbnormal) {
      await this.alertsService.createAlert(
        dto.barnId,
        'abnormal_behavior',
        'warning',
        `Camera AI phát hiện ${dto.abnormalCount ?? 0} con bất thường`,
      );
    }

    // Emit real-time YOLO update qua Socket.IO → room farm_1
    this.eventsGateway.emitYoloUpdate(1, {
      barnId: saved.barnId,
      chickenCount: saved.chickenCount,
      isAbnormal: saved.isAbnormal,
      confidenceAvg: saved.confidenceAvg,
      recordedAt: saved.recordedAt.toISOString(),
    });

    this.logger.log(
      `YOLO detection saved: Barn${saved.barnId} | ${saved.chickenCount} chickens | abnormal=${saved.isAbnormal}`,
    );

    return saved;
  }
}
