import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert, AlertSeverity, AlertType } from './entities/alert.entity';
import { EventsGateway } from '../gateway/events.gateway';
import { Barn } from '../barns/entities/barn.entity';
import { NotificationsService } from '../notifications/notifications.service';

// Các loại cảnh báo nguy hiểm sẽ được gửi push notification
const CRITICAL_ALERT_TYPES: AlertType[] = [
  AlertType.FIRE,
  AlertType.TOXIC_GAS,
  AlertType.HIGH_TEMP,
];

// Icon tương ứng cho từng loại cảnh báo
const ALERT_ICON: Record<string, string> = {
  [AlertType.FIRE]:      '🔥',
  [AlertType.TOXIC_GAS]: '☠️',
  [AlertType.HIGH_TEMP]: '🌡️',
  [AlertType.LOW_WATER]: '💧',
  [AlertType.FEED_EMPTY]:'🍗',
};

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
    @InjectRepository(Barn)
    private barnRepository: Repository<Barn>,
    private eventsGateway: EventsGateway,
    private notificationsService: NotificationsService,
  ) {}

  async getAlerts(barnId: number, limit = 20): Promise<Alert[]> {
    return this.alertRepository.find({
      where: { barnId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUnreadCount(barnId: number): Promise<number> {
    return this.alertRepository.count({
      where: { barnId, isRead: false },
    });
  }

  async markAsRead(alertId: number): Promise<Alert | null> {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId },
    });
    if (!alert) {
      return null;
    }

    alert.isRead = true;
    return this.alertRepository.save(alert);
  }

  async markAllAsRead(barnId: number): Promise<void> {
    await this.alertRepository.update(
      { barnId, isRead: false },
      { isRead: true },
    );
  }

  async createAlert(
    barnId: number,
    alertType: string,
    severity: string,
    message: string,
    detailData?: any,
  ): Promise<Alert> {
    const alert = this.alertRepository.create({
      barnId,
      alertType: alertType as AlertType,
      severity: severity as AlertSeverity,
      message,
      detailData,
      isRead: false,
    });

    const savedAlert = await this.alertRepository.save(alert);

    // Lấy thông tin barn và userId
    const barn = await this.barnRepository.findOne({ where: { id: barnId } });
    const userId = barn?.userId || 1;

    // Emit 'alert:new' via Socket.IO (badge tự cập nhật trên app)
    this.eventsGateway.emitNewAlert(userId, {
      id:        Number(savedAlert.id),
      barnId:    savedAlert.barnId,
      alertType: savedAlert.alertType,
      severity:  savedAlert.severity,
      message:   savedAlert.message,
      createdAt: savedAlert.createdAt,
    });

    // ─── Gửi Push Notification cho các cảnh báo nguy hiểm ──────────────────
    if (CRITICAL_ALERT_TYPES.includes(alertType as AlertType)) {
      const icon  = ALERT_ICON[alertType] ?? '🚨';
      const title = `${icon} Cảnh báo khẩn cấp - ${barn?.name ?? `Chuồng ${barnId}`}`;

      this.notificationsService
        .sendNotification(userId, title, message, {
          alertId:   Number(savedAlert.id),
          alertType: savedAlert.alertType,
          severity:  savedAlert.severity,
          barnId,
        })
        .catch((err) =>
          this.logger.error(`Lỗi gửi push notification: ${err.message}`),
        );

      this.logger.warn(`📱 Push sent for [${alertType}] → userId=${userId}`);
    }

    this.logger.log(
      `Created alert for Barn${barnId}: [${severity}] ${message}`,
    );

    return savedAlert;
  }
}
