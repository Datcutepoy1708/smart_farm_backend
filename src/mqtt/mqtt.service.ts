import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as mqtt from 'mqtt';

import { EnvironmentLog } from '../environment/entities/environment-log.entity';
import { Barn } from '../barns/entities/barn.entity';
import { BarnDevice, DeviceStatus } from '../devices/entities/barn-device.entity';
import { FeedLog } from '../feed/entities/feed-log.entity';
import { Flock, FlockStatus } from '../flocks/entities/flock.entity';
import { DeviceLog, TriggerType, DeviceAction } from '../devices/entities/device-log.entity';
import { EventsGateway } from '../gateway/events.gateway';
import { AlertsService } from '../alerts/alerts.service';
import { NotificationsService } from '../notifications/notifications.service';

interface SensorPayload {
  barn_id: number;
  temperature: number;
  humidity: number;
  water_level?: number;
}

interface AlertPayload {
  barn_id: number;
  type: string;
  message: string;
}

/** Payload ESP32 gửi về sau khi hoàn tất đổ thức ăn và cân */
interface FeedResultPayload {
  device_id: number;
  target_gram: number;   // Khối lượng mục tiêu
  actual_gram: number;   // Khối lượng thực tế cân được
  status: 'ok' | 'insufficient' | 'error';
  schedule_id?: number;
  barn_id?: number;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient | null = null;
  private readonly topicPrefix: string;

  constructor(
    private configService: ConfigService,
    private eventsGateway: EventsGateway,

    @InjectRepository(EnvironmentLog)
    private environmentLogRepository: Repository<EnvironmentLog>,

    @InjectRepository(Barn)
    private barnRepository: Repository<Barn>,

    @InjectRepository(BarnDevice)
    private deviceRepository: Repository<BarnDevice>,

    @InjectRepository(FeedLog)
    private feedLogRepository: Repository<FeedLog>,

    @InjectRepository(Flock)
    private flockRepository: Repository<Flock>,

    @InjectRepository(DeviceLog)
    private deviceLogRepository: Repository<DeviceLog>,

    private alertsService: AlertsService,
    private notificationsService: NotificationsService,
  ) {
    this.topicPrefix =
      this.configService.get<string>('MQTT_TOPIC_PREFIX') ||
      'smartfarm_datcutepoy_2026';
  }

  onModuleInit() {
    const brokerUrl =
      this.configService.get<string>('MQTT_BROKER_URL') ||
      'mqtt://localhost:1883';
    const username = this.configService.get<string>('MQTT_USERNAME') || '';
    const password = this.configService.get<string>('MQTT_PASSWORD') || '';
    const clientId =
      this.configService.get<string>('MQTT_CLIENT_ID') ||
      'smart_farm_backend_client';

    this.logger.log(`🔌 Đang kết nối MQTT broker: ${brokerUrl}`);

    this.client = mqtt.connect(brokerUrl, {
      clientId,
      username: username || undefined,
      password: password || undefined,
      reconnectPeriod: 5000,
      clean: true,
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Đã kết nối MQTT broker thành công!');

      // Subscribe topic sensors
      this.client?.subscribe(`${this.topicPrefix}/+/sensors`, (err) => {
        if (err) {
          this.logger.error('❌ Lỗi subscribe farm/+/sensors:', err.message);
        } else {
          this.logger.log('📡 Subscribed: farm/+/sensors');
        }
      });

      // Subscribe topic alert từ ESP32
      this.client?.subscribe(`${this.topicPrefix}/+/alert`, (err) => {
        if (err) {
          this.logger.error('❌ Lỗi subscribe farm/+/alert:', err.message);
        } else {
          this.logger.log('📡 Subscribed: farm/+/alert');
        }
      });

      // Subscribe topic feed_result: ESP32 báo kết quả cân sau khi đổ thức ăn
      this.client?.subscribe(`${this.topicPrefix}/+/feed_result`, (err) => {
        if (err) {
          this.logger.error('❌ Lỗi subscribe farm/+/feed_result:', err.message);
        } else {
          this.logger.log('📡 Subscribed: farm/+/feed_result');
        }
      });
    });

    this.client.on('message', (topic: string, message: Buffer) => {
      const payload = message.toString();

      if (topic.includes('/sensors')) {
        this.handleSensorData(topic, payload);
      } else if (topic.includes('/feed_result')) {
        this.handleFeedResult(topic, payload);
      } else if (topic.includes('/alert')) {
        this.handleAlertData(topic, payload);
      }
    });

    this.client.on('error', (err) => {
      this.logger.error(`❌ MQTT error: ${err.message}`);
    });

    this.client.on('reconnect', () => {
      this.logger.warn('🔄 Đang reconnect MQTT...');
    });

    this.client.on('offline', () => {
      this.logger.warn('📴 MQTT offline');
    });
  }

  /**
   * Xử lý dữ liệu sensor từ ESP32
   * Topic format: {prefix}/barn{id}/sensors
   * Payload: { barn_id, temperature, humidity, water_level }
   */
  private async handleSensorData(topic: string, payload: string) {
    try {
      const topicParts = topic.split('/');
      const barnSegment = topicParts[1];
      const barnIdFromTopic = parseInt(barnSegment.replace(/\D/g, ''), 10);

      const data: any = JSON.parse(payload);
      const barnId = data.barn_id || barnIdFromTopic || 1;

      if (data.environment && typeof data.environment === 'object') {
        data.temperature = data.environment.temp_c;
        data.humidity = data.environment.humidity_pct;
      }

      const temp = Number(data.temperature);
      const hum = Number(data.humidity);

      if (isNaN(temp) || isNaN(hum)) {
        this.logger.error(`❌ Dữ liệu sensor không hợp lệ (NaN): ${payload}`);
        return;
      }

      data.temperature = temp;
      data.humidity = hum;

      this.logger.log(
        `🌡️ Barn${barnId}: ${data.temperature}°C | ${data.humidity}%` +
          (data.water_level !== undefined ? ` | 💧 ${data.water_level}%` : ''),
      );

      if (data.temperature > 35) {
        this.logger.warn('🔴 CẢNH BÁO: Nhiệt độ cao!');
        await this.alertsService.createAlert(
          barnId,
          'high_temp',
          'critical',
          `Nhiệt độ cao bất thường: ${data.temperature}°C`,
          { temperature: data.temperature },
        );
      } else if (data.temperature < 15) {
        this.logger.warn('🔵 CẢNH BÁO: Nhiệt độ thấp!');
        await this.alertsService.createAlert(
          barnId,
          'low_temp',
          'warning',
          `Nhiệt độ thấp: ${data.temperature}°C`,
          { temperature: data.temperature },
        );
      }

      if (data.humidity > 85) {
        this.logger.warn('💧 CẢNH BÁO: Độ ẩm cao!');
        await this.alertsService.createAlert(
          barnId,
          'high_humidity',
          'warning',
          `Độ ẩm cao: ${data.humidity}%`,
          { humidity: data.humidity },
        );
      }

      const log = this.environmentLogRepository.create({
        barnId,
        temperature: data.temperature,
        humidity: data.humidity,
        rawData: data,
      });

      await this.environmentLogRepository.save(log);
      this.logger.debug(`💾 Đã lưu environment log cho Barn${barnId}`);

      this.eventsGateway.emitFarmOverviewUpdate(1, {
        barnId,
        temperature: data.temperature,
        humidity: data.humidity,
        recordedAt: new Date().toISOString(),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Lỗi xử lý sensor data: ${errMsg}`);
    }
  }

  /**
   * Xử lý kết quả cân sau khi ESP32 đổ thức ăn
   * Topic format: {prefix}/barn{id}/feed_result
   * Payload: { device_id, target_gram, actual_gram, status, schedule_id?, barn_id? }
   */
  private async handleFeedResult(topic: string, payload: string) {
    try {
      const data: FeedResultPayload = JSON.parse(payload);

      // Parse barnId từ topic: "prefix/barn1/feed_result" → 1
      const topicParts = topic.split('/');
      const barnSegment = topicParts[1]; // "barn1"
      const barnIdFromTopic = parseInt(barnSegment.replace(/\D/g, ''), 10);
      const barnId = data.barn_id || barnIdFromTopic || 1;

      this.logger.log(
        `🍗 FeedResult Barn${barnId}: target=${data.target_gram}g | actual=${data.actual_gram}g | status=${data.status}`,
      );

      // 1. Lấy flock đang hoạt động
      const flock = await this.flockRepository.findOne({
        where: { barnId, status: FlockStatus.ACTIVE },
      });

      // 2. Lưu FeedLog với actual_gram thực tế từ cân
      if (flock) {
        const feedLog = this.feedLogRepository.create({
          barnId,
          flockId: flock.id,
          deviceId: data.device_id,
          amountGram: data.actual_gram,       // Khối lượng thực tế cân được
          triggeredBy: TriggerType.SCHEDULE,
          scheduleId: data.schedule_id || undefined,
        });
        await this.feedLogRepository.save(feedLog);
        this.logger.log(`💾 Đã lưu FeedLog: ${data.actual_gram}g cho Barn${barnId}`);
      } else {
        this.logger.warn(
          `⚠️ Không tìm thấy flock active cho Barn${barnId}, bỏ qua lưu FeedLog`,
        );
      }

      // 3. Cập nhật trạng thái thiết bị → OFF (đã xong)
      const device = await this.deviceRepository.findOne({
        where: { id: data.device_id },
      });
      if (device) {
        device.currentStatus = DeviceStatus.OFF;
        await this.deviceRepository.save(device);

        // Log device_logs: OFF
        const deviceLog = this.deviceLogRepository.create({
          barnId,
          deviceId: device.id,
          action: DeviceAction.OFF,
          triggeredBy: TriggerType.SCHEDULE,
        });
        await this.deviceLogRepository.save(deviceLog);
      }

      // 4. Nếu thiếu hụt → tạo Alert + Push Notification
      if (data.status === 'insufficient' || data.status === 'error') {
        const shortage = data.target_gram - data.actual_gram;
        const shortPct = ((shortage / data.target_gram) * 100).toFixed(1);

        const alertMsg =
          `⚠️ Cho ăn không đủ khối lượng! ` +
          `Mục tiêu: ${data.target_gram}g | Thực tế: ${data.actual_gram}g | Thiếu: ${shortage}g (${shortPct}%)`;

        await this.alertsService.createAlert(
          barnId,
          'feed_insufficient',
          'warning',
          alertMsg,
          {
            target_gram: data.target_gram,
            actual_gram: data.actual_gram,
            shortage_gram: shortage,
            schedule_id: data.schedule_id,
          },
        );

        // Gửi Push Notification về điện thoại
        const barn = await this.barnRepository.findOne({ where: { id: barnId } });
        const userId = barn?.userId || 1;

        await this.notificationsService.sendNotification(
          userId,
          '🐔 Cảnh báo cho ăn',
          `Chuồng ${barnId}: Thiếu ${shortage}g thức ăn (${data.actual_gram}/${data.target_gram}g)`,
          {
            barnId,
            type: 'feed_insufficient',
            target_gram: data.target_gram,
            actual_gram: data.actual_gram,
          },
        );

        this.logger.warn(
          `🚨 Feed insufficient Barn${barnId}: thiếu ${shortage}g → Đã gửi alert + push notification`,
        );
      } else {
        this.logger.log(
          `✅ Cho ăn đủ khối lượng Barn${barnId}: ${data.actual_gram}g`,
        );
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Lỗi xử lý feed_result: ${errMsg}`);
    }
  }

  /**
   * Xử lý cảnh báo khẩn cấp từ ESP32
   * Topic format: {prefix}/barn{id}/alert
   * Payload: { barn_id, type: 'fire' | 'toxic_gas' | ..., message, value? }
   */
  private async handleAlertData(topic: string, payload: string) {
    try {
      const data: AlertPayload & { value?: number } = JSON.parse(payload);

      // Parse barnId từ topic nếu payload không có
      const topicParts = topic.split('/');
      const barnSegment = topicParts[1];
      const barnIdFromTopic = parseInt(barnSegment.replace(/\D/g, ''), 10);
      const barnId = data.barn_id || barnIdFromTopic || 1;

      this.logger.warn(
        `🚨 Alert Barn${barnId}: [${data.type}] ${data.message}`,
      );

      // ── Xác định nội dung cảnh báo theo loại ──────────────────────────────
      let alertType = 'sensor_offline'; // fallback
      let severity = 'warning';
      let title = '⚠️ Cảnh báo hệ thống';
      let message = data.message || 'Phát hiện bất thường tại chuồng nuôi';

      switch (data.type) {
        case 'fire':
          alertType = 'fire';
          severity = 'critical';
          title = '🔥 CẢNH BÁO CHÁY KHẨN CẤP';
          message = data.message || `Phát hiện lửa/nhiệt độ cực cao tại Chuồng ${barnId}! Cửa thoát hiểm đã tự động mở.`;
          break;

        case 'toxic_gas':
          alertType = 'toxic_gas';
          severity = 'critical';
          title = '☠️ CẢNH BÁO KHÍ ĐỘC';
          message = data.message || `Phát hiện khí độc/khói tại Chuồng ${barnId}! Cần xử lý ngay lập tức.`;
          break;

        default:
          alertType = data.type || 'sensor_offline';
          severity = 'warning';
          title = '⚠️ Cảnh báo';
          message = data.message || `Cảnh báo không xác định tại Chuồng ${barnId}`;
      }

      // ── Lưu Alert vào Database ────────────────────────────────────────────
      await this.alertsService.createAlert(
        barnId,
        alertType,
        severity,
        message,
        {
          type: data.type,
          value: data.value,
          source: 'esp32_hardware_interrupt',
          timestamp: new Date().toISOString(),
        },
      );

      // ── Gửi Push Notification khẩn cấp về điện thoại ─────────────────────
      const barn = await this.barnRepository.findOne({ where: { id: barnId } });
      const userId = barn?.userId || 1;

      await this.notificationsService.sendNotification(
        userId,
        title,
        `Chuồng ${barnId}: ${message}`,
        {
          barnId,
          type: alertType,
          severity,
          value: data.value,
        },
      );

      this.logger.warn(
        `🚨 [${severity.toUpperCase()}] Barn${barnId} - ${alertType}: Đã lưu alert + gửi push notification`,
      );
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Lỗi xử lý alert data: ${errMsg} | Payload: ${payload}`);
    }
  }

  /**
   * Gửi lệnh xuống ESP32 qua MQTT
   */
  publish(topic: string, payload: string) {
    if (!this.client || !this.client.connected) {
      this.logger.error('❌ MQTT client chưa kết nối, không thể publish');
      return;
    }

    this.client.publish(topic, payload, (err) => {
      if (err) {
        this.logger.error(`❌ Lỗi publish to ${topic}: ${err.message}`);
      } else {
        this.logger.log(`📤 Published to ${topic}: ${payload}`);
      }
    });
  }

  /**
   * Gửi lệnh điều khiển ESP32 qua MQTT control topic
   * Topic: {prefix}/barn{barnId}/control
   */
  publishControl(barnId: number, device: string, params: Record<string, unknown> = {}) {
    const topic = `${this.topicPrefix}/barn${barnId}/control`;
    const payload = JSON.stringify({ device, ...params });
    this.publish(topic, payload);
    this.logger.log(`🎮 Control Barn${barnId}: ${device} → ${JSON.stringify(params)}`);
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end(true);
      this.logger.log('🔌 Đã ngắt kết nối MQTT');
    }
  }
}
