import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert, AlertSeverity, AlertType } from './entities/alert.entity';
import { EventsGateway } from '../gateway/events.gateway';
import { Barn } from '../barns/entities/barn.entity';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
    @InjectRepository(Barn)
    private barnRepository: Repository<Barn>,
    private eventsGateway: EventsGateway,
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

    // Find barn user to emit to the correct room
    const barn = await this.barnRepository.findOne({ where: { id: barnId } });
    // Assuming barn has user_id, if not we will emit to userId=1 (like in MQTT temporarily)
    const userId = barn?.userId || 1;

    // Emit 'alert:new' via Socket.IO
    this.eventsGateway.emitNewAlert(userId, {
      id: Number(savedAlert.id),
      barnId: savedAlert.barnId,
      alertType: savedAlert.alertType,
      severity: savedAlert.severity,
      message: savedAlert.message,
      createdAt: savedAlert.createdAt,
    });

    this.logger.log(
      `Created alert for Barn${barnId}: [${severity}] ${message}`,
    );

    return savedAlert;
  }
}
