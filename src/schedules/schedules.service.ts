import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

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

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

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
  ) {}

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

    // Return with device relation
    return this.getScheduleById(saved.id);
  }

  async updateSchedule(id: number, dto: UpdateScheduleDto): Promise<Schedule> {
    const schedule = await this.getScheduleById(id);

    // Check if device is valid if it's being updated
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

  @Cron(CronExpression.EVERY_MINUTE)
  async runScheduledJobs() {
    this.logger.debug('Running scheduled jobs check...');

    const activeSchedules = await this.scheduleRepo.find({
      where: { isActive: true },
      relations: ['device'],
    });

    if (activeSchedules.length === 0) return;

    // Lấy timestamp hiện tại
    const now = new Date();

    // Lấy giờ phút format HH:MM theo giờ local (VN)
    // Dùng padStart để đảm bảo 2 chữ số (VD: 09:05 instead of 9:5)
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;

    // JS Date.getDay() trả về 0-CN, 1-T2, ..., 6-T7.
    // Map về chuẩn: 1=T2, 2=T3, ..., 6=T7, 7=CN
    const jsDay = now.getDay();
    const currentDayOfWeek = jsDay === 0 ? 7 : jsDay;

    for (const schedule of activeSchedules) {
      // 1. Check time and day
      if (
        schedule.scheduledTime === currentTime &&
        schedule.daysOfWeek.includes(currentDayOfWeek)
      ) {
        this.triggerSchedule(schedule, now);
      }
    }
  }

  private async triggerSchedule(schedule: Schedule, timestamp: Date) {
    const { device, barnId, name, durationSeconds } = schedule;

    if (!device || !device.isActive) {
      this.logger.warn(
        `⏳ Schedule [${name}] skipped: Device inactive or missing.`,
      );
      return;
    }

    this.logger.log(`⏰ Schedule [${name}] triggered: ${device.name} ON`);

    // 1. MQTT Publish ON
    const payloadOn = {
      device_id: device.id,
      action: DeviceAction.ON,
      timestamp: timestamp.toISOString(),
      ...(schedule.feedAmountGram
        ? { amount_gram: schedule.feedAmountGram }
        : {}),
    };

    const controlTopic = `farm/barn${barnId}/control`;
    this.mqttService.publish(controlTopic, JSON.stringify(payloadOn));

    // 2. Update Device Status
    device.currentStatus = DeviceStatus.ON;
    await this.deviceRepo.save(device);

    // 3. Log to device_logs
    const deviceLogOn = this.deviceLogRepo.create({
      barnId,
      deviceId: device.id,
      action: DeviceAction.ON,
      triggeredBy: TriggerType.SCHEDULE,
    });
    await this.deviceLogRepo.save(deviceLogOn);

    // 4. If feeder, log feed_logs
    if (device.deviceType === DeviceType.FEEDER && schedule.feedAmountGram) {
      const activeFlock = await this.flockRepo.findOne({
        where: { barnId, status: FlockStatus.ACTIVE },
      });

      if (activeFlock) {
        const feedLog = this.feedLogRepo.create({
          barnId,
          flockId: activeFlock.id,
          deviceId: device.id,
          amountGram: schedule.feedAmountGram,
          triggeredBy: TriggerType.SCHEDULE,
          scheduleId: schedule.id,
        });
        await this.feedLogRepo.save(feedLog);
      } else {
        this.logger.warn(
          `⚠ Feeder triggered for barn ${barnId} but no ACTIVE flock found. Skipped creating feed_logs.`,
        );
      }
    }

    // 5. Schedule OFF timeout
    setTimeout(async () => {
      this.logger.log(
        `⏰ Schedule [${name}]: ${device.name} OFF after ${durationSeconds}s`,
      );

      // Publish OFF
      const payloadOff = {
        device_id: device.id,
        action: DeviceAction.OFF,
        timestamp: new Date().toISOString(),
      };
      this.mqttService.publish(controlTopic, JSON.stringify(payloadOff));

      // Update Device Status
      const freshDevice = await this.deviceRepo.findOne({
        where: { id: device.id },
      });
      if (freshDevice) {
        freshDevice.currentStatus = DeviceStatus.OFF;
        await this.deviceRepo.save(freshDevice);
      }

      // Log Device OFF
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
