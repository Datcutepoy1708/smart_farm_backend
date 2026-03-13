import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Barn, BarnStatus } from './entities/barn.entity';
import { EnvironmentLog } from '../environment/entities/environment-log.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { Flock, FlockStatus } from '../flocks/entities/flock.entity';
import { CreateBarnDto } from './dto/create-barn.dto';

interface BarnOverviewItem {
  id: number;
  name: string;
  chickenCount: number;
  temperature: number | null;
  humidity: number | null;
  status: string;
}

export interface Activity {
  id: number;
  type: 'alert' | 'feeding' | 'device' | 'note';
  title: string;
  description: string;
  barnName: string;
  createdAt: string;
}

export interface FarmOverview {
  totalBarns: number;
  totalChickens: number;
  avgTemperature: number;
  avgHumidity: number;
  unreadAlerts: number;
  barns: BarnOverviewItem[];
  recentActivities: Activity[];
}

@Injectable()
export class BarnsService {
  constructor(
    @InjectRepository(Barn)
    private barnRepository: Repository<Barn>,

    @InjectRepository(EnvironmentLog)
    private environmentLogRepository: Repository<EnvironmentLog>,

    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,

    @InjectRepository(Flock)
    private flockRepository: Repository<Flock>,
  ) {}

  async getBarns(userId: number) {
    const barns = await this.barnRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: barns,
    };
  }

  async getBarnById(id: number) {
    const barn = await this.barnRepository.findOne({
      where: { id },
      relations: ['flocks', 'devices'],
    });

    if (!barn) {
      throw new NotFoundException(`Barn với id ${id} không tồn tại`);
    }

    // Lấy environment_log mới nhất của barn
    const latestLog = await this.environmentLogRepository.findOne({
      where: { barnId: id },
      order: { recordedAt: 'DESC' },
    });

    return {
      success: true,
      data: {
        ...barn,
        latestEnvironment: latestLog
          ? {
              temperature: latestLog.temperature,
              humidity: latestLog.humidity,
              recordedAt: latestLog.recordedAt,
            }
          : null,
      },
    };
  }

  async createBarn(userId: number, dto: CreateBarnDto) {
    const barn = this.barnRepository.create({
      userId,
      name: dto.name,
      location: dto.location,
      capacity: dto.capacity ?? 0,
      status: dto.status ?? BarnStatus.ACTIVE,
    });

    const savedBarn = await this.barnRepository.save(barn);

    return {
      success: true,
      data: savedBarn,
    };
  }

  async getFarmOverview(userId: number): Promise<{ success: true; data: FarmOverview }> {
    // 1. Lấy tất cả barns của user
    const barns = await this.barnRepository.find({
      where: { userId },
    });

    // 2. Đếm unread alerts
    const unreadAlerts = await this.alertRepository.count({
      where: { isRead: false },
    });

    // 3. Lấy thông tin chi tiết từng barn
    const barnOverviews: BarnOverviewItem[] = [];
    let totalChickens = 0;
    const temperatures: number[] = [];
    const humidities: number[] = [];

    for (const barn of barns) {
      // Lấy flock active của barn
      const activeFlock = await this.flockRepository.findOne({
        where: { barnId: barn.id, status: FlockStatus.ACTIVE },
        order: { createdAt: 'DESC' },
      });

      const chickenCount = activeFlock?.currentCount ?? 0;
      totalChickens += chickenCount;

      // Lấy environment_log mới nhất
      const latestLog = await this.environmentLogRepository.findOne({
        where: { barnId: barn.id },
        order: { recordedAt: 'DESC' },
      });

      if (latestLog) {
        temperatures.push(latestLog.temperature);
        humidities.push(latestLog.humidity);
      }

      barnOverviews.push({
        id: barn.id,
        name: barn.name,
        chickenCount,
        temperature: latestLog?.temperature ?? null,
        humidity: latestLog?.humidity ?? null,
        status: barn.status,
      });
    }

    // 4. Tính trung bình
    const avgTemperature =
      temperatures.length > 0
        ? Math.round(
            (temperatures.reduce((a, b) => a + b, 0) / temperatures.length) * 10,
          ) / 10
        : 0;

    const avgHumidity =
      humidities.length > 0
        ? Math.round(
            (humidities.reduce((a, b) => a + b, 0) / humidities.length) * 10,
          ) / 10
        : 0;

    return {
      success: true,
      data: {
        totalBarns: barns.length,
        totalChickens,
        avgTemperature,
        avgHumidity,
        unreadAlerts,
        barns: barnOverviews,
        recentActivities: [], // TODO: implement later
      },
    };
  }
}
