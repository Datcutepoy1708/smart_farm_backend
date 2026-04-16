import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';

import { Schedule } from './entities/schedule.entity';
import {
  BarnDevice,
  DeviceType,
  DeviceStatus,
} from '../devices/entities/barn-device.entity';
import {
  DeviceLog,
  TriggerType,
  DeviceAction,
} from '../devices/entities/device-log.entity';
import { FeedLog } from '../feed/entities/feed-log.entity';
import { Flock, FlockStatus } from '../flocks/entities/flock.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { MqttService } from '../mqtt/mqtt.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  /**
   * Set deduplication: mỗi schedule chỉ trigger 1 lần / phút.
   * Key format: "{scheduleId}-{YYYYMMDD}-{HH}{MM}"
   */
  private readonly triggeredKeys = new Set<string>();

  /** Topic prefix từ env (vd: smartfarm_datcutepoy_2026) */
  private readonly topicPrefix: string;

  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(BarnDevice)
    private readonly deviceRepo: Repository<BarnDevice>,
    @InjectRepository(DeviceLog)
    private readonly deviceLogRepo: Repository<DeviceLog>,
    @InjectRepository(FeedLog)
    private readonly feedLogRepo: Repository<FeedLog>,
    @InjectRepository(Flock)
    private readonly flockRepo: Repository<Flock>,
    private readonly mqttService: MqttService,
    private readonly configService: ConfigService,
  ) {
    this.topicPrefix =
      this.configService.get<string>('MQTT_TOPIC_PREFIX') ||
      'smartfarm_datcutepoy_2026';
  }

  async getSchedules(barnId: number): Promise<Schedule[]> {
    return this.scheduleRepo.find({
      where: { barnId },
      relations: ['device'],
      order: { createdAt: 'DESC' },
    });
  }

  async getScheduleById(id: number): Promise<Schedule> {
    const schedule = await this.scheduleRepo.findOne({
      where: { id },
      relations: ['device'],
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule ${id} not found`);
    }

    return schedule;
  }

  async createSchedule(dto: CreateScheduleDto): Promise<Schedule> {
    const device = await this.deviceRepo.findOne({
      where: { id: dto.deviceId },
    });
    if (!device) {
      throw new NotFoundException(`Device ${dto.deviceId} not found`);
    }

    const schedule = this.scheduleRepo.create(dto);
    const saved = await this.scheduleRepo.save(schedule);

    return this.getScheduleById(saved.id);
  }

  async updateSchedule(id: number, dto: UpdateScheduleDto): Promise<Schedule> {
    const schedule = await this.getScheduleById(id);

    if (dto.deviceId && dto.deviceId !== schedule.deviceId) {
      const device = await this.deviceRepo.findOne({
        where: { id: dto.deviceId },
      });
      if (!device) {
        throw new NotFoundException(`Device ${dto.deviceId} not found`);
      }
    }

    Object.assign(schedule, dto);
    const updated = await this.scheduleRepo.save(schedule);

    return this.getScheduleById(updated.id);
  }

  async deleteSchedule(id: number): Promise<void> {
    const schedule = await this.getScheduleById(id);
    await this.scheduleRepo.remove(schedule);
  }

  /**
   * Cron chạy mỗi 10 giây để check lịch hẹn.
   * Độ chính xác: trong vòng 10 giây của phút đặt lịch.
   * Dedup bằng Set key → mỗi schedule chỉ trigger TỐI ĐA 1 lần/phút.
   */
  @Cron('*/10 * * * * *')
  async runScheduledJobs() {
    const now = new Date();

    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    // Ngày trong tuần: JS 0=CN → map 1=T2,...,6=T7,7=CN
    const jsDay = now.getDay();
    const currentDayOfWeek = jsDay === 0 ? 7 : jsDay;

    // Dedup key prefix cho phút này
    const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const minuteKey = `${dateStr}-${hh}${mm}`;

    const activeSchedules = await this.scheduleRepo.find({
      where: { isActive: true },
      relations: ['device'],
    });

    if (activeSchedules.length === 0) return;

    for (const schedule of activeSchedules) {
      const dedupKey = `${schedule.id}-${minuteKey}`;

      if (
        schedule.scheduledTime === currentTime &&
        schedule.daysOfWeek.includes(currentDayOfWeek) &&
        !this.triggeredKeys.has(dedupKey)
      ) {
        // Đánh dấu đã trigger trong phút này
        this.triggeredKeys.add(dedupKey);
        this.triggerSchedule(schedule, now);
      }
    }

    // Cleanup Set nếu quá lớn (tránh memory leak khi chạy lâu dài)
    if (this.triggeredKeys.size > 2000) {
      this.triggeredKeys.clear();
      this.logger.debug('🧹 Đã cleanup dedup keys');
    }
  }

  private async triggerSchedule(schedule: Schedule, timestamp: Date) {
    const { device, barnId, name } = schedule;

    if (!device || !device.isActive) {
      this.logger.warn(
        `⏳ Schedule [${name}] skipped: Device inactive or missing.`,
      );
      return;
    }

    const controlTopic = `${this.topicPrefix}/barn${barnId}/control`;

    // ── Feeder: gửi lệnh FEED theo khối lượng ──────────────────────────────
    if (device.deviceType === DeviceType.FEEDER) {
      if (!schedule.feedAmountGram || schedule.feedAmountGram <= 0) {
        this.logger.warn(
          `⏳ Schedule [${name}] skipped: feedAmountGram chưa được đặt.`,
        );
        return;
      }

      this.logger.log(
        `⏰ Schedule [${name}] triggered: Feeder ${device.name} → ${schedule.feedAmountGram}g`,
      );

      // Gửi MQTT lệnh cho ăn theo khối lượng
      const payload = {
        device_id: device.id,
        action: 'FEED',
        target_gram: schedule.feedAmountGram,
        schedule_id: schedule.id,
        barn_id: barnId,
        timestamp: timestamp.toISOString(),
      };
      this.mqttService.publish(controlTopic, JSON.stringify(payload));

      // Cập nhật trạng thái device = đang hoạt động
      device.currentStatus = DeviceStatus.ON;
      await this.deviceRepo.save(device);

      // Log device_logs: FEED trigger
      const deviceLog = this.deviceLogRepo.create({
        barnId,
        deviceId: device.id,
        action: DeviceAction.ON,
        triggeredBy: TriggerType.SCHEDULE,
      });
      await this.deviceLogRepo.save(deviceLog);

      // Kết quả thực tế (actual_gram) sẽ được nhận qua MQTT feed_result từ ESP32
      // và xử lý trong MqttService.handleFeedResult()
      this.logger.log(
        `📤 Đã gửi lệnh FEED ${schedule.feedAmountGram}g tới ${controlTopic}`,
      );
    } else {
      // ── Các thiết bị khác (fan, heater, ...): vẫn ON/OFF theo thời gian ──
      this.logger.log(
        `⏰ Schedule [${name}] triggered: ${device.name} ON`,
      );

      const payloadOn = {
        device_id: device.id,
        action: DeviceAction.ON,
        timestamp: timestamp.toISOString(),
      };
      this.mqttService.publish(controlTopic, JSON.stringify(payloadOn));

      device.currentStatus = DeviceStatus.ON;
      await this.deviceRepo.save(device);

      const deviceLogOn = this.deviceLogRepo.create({
        barnId,
        deviceId: device.id,
        action: DeviceAction.ON,
        triggeredBy: TriggerType.SCHEDULE,
      });
      await this.deviceLogRepo.save(deviceLogOn);

      // Giữ logic setTimeout OFF cho thiết bị không phải feeder
      const durationSeconds = schedule.durationSeconds || 30;
      setTimeout(async () => {
        this.logger.log(
          `⏰ Schedule [${name}]: ${device.name} OFF after ${durationSeconds}s`,
        );

        const payloadOff = {
          device_id: device.id,
          action: DeviceAction.OFF,
          timestamp: new Date().toISOString(),
        };
        this.mqttService.publish(controlTopic, JSON.stringify(payloadOff));

        const freshDevice = await this.deviceRepo.findOne({
          where: { id: device.id },
        });
        if (freshDevice) {
          freshDevice.currentStatus = DeviceStatus.OFF;
          await this.deviceRepo.save(freshDevice);
        }

        const deviceLogOff = this.deviceLogRepo.create({
          barnId,
          deviceId: device.id,
          action: DeviceAction.OFF,
          triggeredBy: TriggerType.SCHEDULE,
        });
        await this.deviceLogRepo.save(deviceLogOff);
      }, durationSeconds * 1000);
    }
  }
}
