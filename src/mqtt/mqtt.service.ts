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
import { EventsGateway } from '../gateway/events.gateway';
import { AlertsService } from '../alerts/alerts.service';

// API sẽ kết nối sau:
// GET  /api/barns/:barnId/environment  → lấy dữ liệu sensor
// POST /api/devices/:deviceId/command  → gửi lệnh xuống ESP32

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

    private alertsService: AlertsService,
  ) {
    this.topicPrefix = this.configService.get<string>('MQTT_TOPIC_PREFIX') || 'smartfarm_datcutepoy_2026';
  }

  onModuleInit() {
    const brokerUrl = this.configService.get<string>('MQTT_BROKER_URL') || 'mqtt://localhost:1883';
    const username = this.configService.get<string>('MQTT_USERNAME') || '';
    const password = this.configService.get<string>('MQTT_PASSWORD') || '';
    const clientId = this.configService.get<string>('MQTT_CLIENT_ID') || 'smart_farm_backend_client';


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

      // Subscribe các topics
      this.client?.subscribe(`${this.topicPrefix}/+/sensors`, (err) => {
        if (err) {
          this.logger.error('❌ Lỗi subscribe farm/+/sensors:', err.message);
        } else {
          this.logger.log('📡 Subscribed: farm/+/sensors');
        }
      });

      this.client?.subscribe(`${this.topicPrefix}/+/alert`, (err) => {
        if (err) {
          this.logger.error('❌ Lỗi subscribe farm/+/alert:', err.message);
        } else {
          this.logger.log('📡 Subscribed: farm/+/alert');
        }
      });
    });

    this.client.on('message', (topic: string, message: Buffer) => {
      const payload = message.toString();

      if (topic.includes('/sensors')) {
        this.handleSensorData(topic, payload);
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
   * Topic format: farm/barn{id}/sensors
   * Payload: { barn_id, temperature, humidity, water_level }
   */
  private async handleSensorData(topic: string, payload: string) {
    try {
      // Parse topic lấy barnId: "farm/barn1/sensors" → barnId = 1
      const topicParts = topic.split('/');
      const barnSegment = topicParts[1]; // "barn1"
      const barnIdFromTopic = parseInt(barnSegment.replace(/\D/g, ''), 10);

      const data: any = JSON.parse(payload);
      const barnId = data.barn_id || barnIdFromTopic || 1; // Default fallback to 1

      // Translate Greenhouse deep object payloads to standard flat schema
      if (data.environment && typeof data.environment === 'object') {
         data.temperature = data.environment.temp_c;
         data.humidity = data.environment.humidity_pct;
      }

      // Ensure numbers are valid
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

      // Kiểm tra ngưỡng cảnh báo
      if (data.temperature > 35) {
        this.logger.warn('🔴 CẢNH BÁO: Nhiệt độ cao!');
        await this.alertsService.createAlert(
          barnId,
          'high_temp',
          'critical',
          `Nhiệt độ cao bất thường: ${data.temperature}°C`,
          { temperature: data.temperature }
        );
      } else if (data.temperature < 15) {
        this.logger.warn('🔵 CẢNH BÁO: Nhiệt độ thấp!');
        await this.alertsService.createAlert(
          barnId,
          'low_temp',
          'warning',
          `Nhiệt độ thấp: ${data.temperature}°C`,
          { temperature: data.temperature }
        );
      }
      
      if (data.humidity > 85) {
        this.logger.warn('💧 CẢNH BÁO: Độ ẩm cao!');
        await this.alertsService.createAlert(
          barnId,
          'high_humidity',
          'warning',
          `Độ ẩm cao: ${data.humidity}%`,
          { humidity: data.humidity }
        );
      }

      // Lưu vào environment_logs
      const log = this.environmentLogRepository.create({
        barnId,
        temperature: data.temperature,
        humidity: data.humidity,
        rawData: data,
      });

      await this.environmentLogRepository.save(log);
      this.logger.debug(`💾 Đã lưu environment log cho Barn${barnId}`);

      // Emit real-time update qua Socket.IO
      // TODO: userId hardcode = 1, sau cải thiện lấy từ barn.userId
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
   * Xử lý cảnh báo từ ESP32
   * Topic format: farm/barn{id}/alert
   */
  private handleAlertData(topic: string, payload: string) {
    try {
      this.logger.warn(`🚨 Alert từ barn: ${payload}`);

      const data: AlertPayload = JSON.parse(payload);
      this.logger.warn(
        `🚨 Alert Barn${data.barn_id}: [${data.type}] ${data.message}`,
      );
    } catch {
      this.logger.warn(`🚨 Alert raw: ${payload}`);
    }
  }

  /**
   * Gửi lệnh xuống ESP32 qua MQTT
   * Ví dụ: publish('farm/barn1/control', '{"device":"fan","action":"on"}')
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

  onModuleDestroy() {
    if (this.client) {
      this.client.end(true);
      this.logger.log('🔌 Đã ngắt kết nối MQTT');
    }
  }
}
