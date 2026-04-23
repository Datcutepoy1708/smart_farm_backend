import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BarnDevice } from './entities/barn-device.entity';
import { DeviceLog } from './entities/device-log.entity';
import { Barn } from '../barns/entities/barn.entity';
import { MqttService } from '../mqtt/mqtt.service';
import { EventsGateway } from '../gateway/events.gateway';
import { ControlDeviceDto } from './dto/control-device.dto';
import { CreateDeviceDto } from './dto/create-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(BarnDevice)
    private readonly barnDeviceRepository: Repository<BarnDevice>,
    @InjectRepository(DeviceLog)
    private readonly deviceLogRepository: Repository<DeviceLog>,
    @InjectRepository(Barn)
    private readonly barnRepository: Repository<Barn>,
    private readonly mqttService: MqttService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getDevices(barnId: number) {
    return this.barnDeviceRepository.find({
      where: { barnId, isActive: true },
      order: { deviceType: 'ASC' },
    });
  }

  async getDeviceById(id: number) {
    const device = await this.barnDeviceRepository.findOne({ where: { id } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  async controlDevice(deviceId: number, action: string, userId: number) {
    const device = await this.barnDeviceRepository.findOne({
      where: { id: deviceId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.currentStatus = action;
    await this.barnDeviceRepository.save(device);

    // Map deviceType DB -> ten lenh ESP32
    const deviceCommandMap: Record<string, string> = {
      fan:      'FAN',
      heater:   'HEATER',
      light:    'LIGHT',
      door:     'DOOR',
      water:    'PUMP',      // ESP32 dung ten 'PUMP'
      feeder:   'FEED',      // ESP32 dung ten 'FEED'
      conveyor: 'CONVEYOR',
      buzzer:   'BUZZER',
    };
    const espDevice = deviceCommandMap[device.deviceType] || device.deviceType.toUpperCase();

    // FIX: Publish len topic control chung -- ESP32 subscribe va xu ly theo field 'device'
    // Format: {"device": "FAN", "action": "ON"}
    const TOPIC_PREFIX = 'smartfarm_datcutepoy_2026';
    const controlTopic = `${TOPIC_PREFIX}/barn${device.barnId}/control`;
    const payload = JSON.stringify({
      device: espDevice,
      action,
      device_id: deviceId,
      timestamp: new Date().toISOString(),
    });
    this.mqttService.publish(controlTopic, payload);

    const log = this.deviceLogRepository.create({
      barnId: device.barnId,
      deviceId: device.id,
      action,
      triggeredBy: 'manual',
      userId,
    });
    await this.deviceLogRepository.save(log);

    // Assuming the user needs to know their real-time device status update in their specific room
    this.eventsGateway.server.to(`farm_${userId}`).emit('device:status', {
      barn_id: device.barnId,
      device_id: device.id,
      name: device.name,
      device_type: device.deviceType,
      status: action,
      updated_at: device.updatedAt,
    });

    return device;
  }

  async createDevice(barnId: number, dto: CreateDeviceDto) {
    const device = this.barnDeviceRepository.create({
      barnId,
      name: dto.name,
      deviceType: dto.deviceType,
      mqttTopic: `farm/barn${barnId}/${dto.deviceType}`,
    });
    return this.barnDeviceRepository.save(device);
  }

  async getDeviceLogs(deviceId: number, limit: number = 10) {
    return this.deviceLogRepository.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
