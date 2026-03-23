import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Barn, BarnStatus } from './entities/barn.entity';
import { Flock, FlockStatus } from '../flocks/entities/flock.entity';
import { EnvironmentLog } from '../environment/entities/environment-log.entity';
import { Alert } from '../alerts/entities/alert.entity';

@Injectable()
export class BarnsService {
  constructor(
    @InjectRepository(Barn)
    private readonly barnRepo: Repository<Barn>,

    @InjectRepository(Flock)
    private readonly flockRepo: Repository<Flock>,

    @InjectRepository(EnvironmentLog)
    private readonly envLogRepo: Repository<EnvironmentLog>,

    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
  ) {}

  /** GET /barns/overview — tổng quan toàn trang trại của user */
  async getOverview(userId: number) {
    const barns = await this.barnRepo.find({ where: { userId } });

    const barnSummaries = await Promise.all(
      barns.map(async (barn) => {
        // Lấy số gà hiện tại từ flock đang active
        const activeFlock = await this.flockRepo.findOne({
          where: { barnId: barn.id, status: FlockStatus.ACTIVE },
          order: { startDate: 'DESC' },
        });

        // Lấy log môi trường mới nhất
        const latestEnvLog = await this.envLogRepo.findOne({
          where: { barnId: barn.id },
          order: { recordedAt: 'DESC' },
        });

        return {
          id: barn.id,
          name: barn.name,
          chickenCount: activeFlock?.currentCount ?? 0,
          temperature: latestEnvLog?.temperature ?? null,
          humidity: latestEnvLog?.humidity ?? null,
          status: barn.status,
        };
      }),
    );

    // Tổng gà
    const totalChickens = barnSummaries.reduce((s, b) => s + b.chickenCount, 0);

    // Nhiệt độ & độ ẩm trung bình (chỉ tính barn có dữ liệu)
    const validTemps = barnSummaries.map((b) => b.temperature).filter((t): t is number => t !== null);
    const validHums = barnSummaries.map((b) => b.humidity).filter((h): h is number => h !== null);

    const avgTemperature =
      validTemps.length > 0
        ? Math.round((validTemps.reduce((a, b) => a + b, 0) / validTemps.length) * 10) / 10
        : 0;

    const avgHumidity =
      validHums.length > 0
        ? Math.round((validHums.reduce((a, b) => a + b, 0) / validHums.length) * 10) / 10
        : 0;

    // Đếm cảnh báo chưa đọc của tất cả barns
    const barnIds = barns.map((b) => b.id);
    let unreadAlerts = 0;
    if (barnIds.length > 0) {
      unreadAlerts = await this.alertRepo
        .createQueryBuilder('alert')
        .where('alert.barnId IN (:...barnIds)', { barnIds })
        .andWhere('alert.isRead = :isRead', { isRead: false })
        .getCount();
    }

    return {
      totalBarns: barns.length,
      totalChickens,
      avgTemperature,
      avgHumidity,
      unreadAlerts,
      barns: barnSummaries,
    };
  }

  /** GET /barns */
  async getAll(userId: number): Promise<Barn[]> {
    return this.barnRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  /** GET /barns/:id */
  async getOne(id: number, userId: number): Promise<Barn> {
    const barn = await this.barnRepo.findOne({ where: { id, userId } });
    if (!barn) throw new NotFoundException(`Barn #${id} not found`);
    return barn;
  }

  /** POST /barns */
  async create(userId: number, dto: { name: string; location?: string; capacity?: number }): Promise<Barn> {
    const barn = this.barnRepo.create({
      userId,
      name: dto.name,
      location: dto.location,
      capacity: dto.capacity ?? 0,
      status: BarnStatus.EMPTY,
    });
    return this.barnRepo.save(barn);
  }

  /** PUT /barns/:id */
  async update(id: number, userId: number, dto: Partial<{ name: string; location: string; capacity: number; status: BarnStatus }>): Promise<Barn> {
    const barn = await this.getOne(id, userId);
    Object.assign(barn, dto);
    return this.barnRepo.save(barn);
  }
}

