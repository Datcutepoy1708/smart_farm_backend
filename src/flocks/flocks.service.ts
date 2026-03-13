import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Flock, FlockStage, FlockStatus } from './entities/flock.entity';
import { Barn } from '../barns/entities/barn.entity';
import { CreateFlockDto } from './dto/create-flock.dto';
import { UpdateFlockDto } from './dto/update-flock.dto';

@Injectable()
export class FlocksService {
  constructor(
    @InjectRepository(Flock)
    private flockRepository: Repository<Flock>,

    @InjectRepository(Barn)
    private barnRepository: Repository<Barn>,
  ) {}

  /**
   * Tính số ngày tuổi từ startDate đến hôm nay
   */
  private calculateAgeDays(startDate: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - new Date(startDate).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Tự xác định giai đoạn nuôi theo ngày tuổi
   * 0-21  ngày → starter
   * 22-35 ngày → grower
   * 36+   ngày → finisher
   */
  private determineStage(ageDays: number): FlockStage {
    if (ageDays <= 21) return FlockStage.STARTER;
    if (ageDays <= 35) return FlockStage.GROWER;
    return FlockStage.FINISHER;
  }

  async getActiveFlock(barnId: number) {
    const flock = await this.flockRepository.findOne({
      where: { barnId, status: FlockStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    if (!flock) {
      throw new NotFoundException(`Barn ${barnId} chưa có flock active`);
    }

    // Tự tính lại ageDays và stage
    const ageDays = this.calculateAgeDays(flock.startDate);
    const stage = this.determineStage(ageDays);

    return {
      success: true,
      data: {
        ...flock,
        currentAgeDays: ageDays,
        currentStage: stage,
      },
    };
  }

  async getFlockById(id: number) {
    const flock = await this.flockRepository.findOne({
      where: { id },
      relations: ['barn'],
    });

    if (!flock) {
      throw new NotFoundException(`Flock với id ${id} không tồn tại`);
    }

    const ageDays = this.calculateAgeDays(flock.startDate);
    const stage = this.determineStage(ageDays);

    return {
      success: true,
      data: {
        ...flock,
        currentAgeDays: ageDays,
        currentStage: stage,
      },
    };
  }

  async createFlock(dto: CreateFlockDto) {
    // Kiểm tra barn tồn tại
    const barn = await this.barnRepository.findOne({
      where: { id: dto.barnId },
    });

    if (!barn) {
      throw new NotFoundException(`Barn với id ${dto.barnId} không tồn tại`);
    }

    const startDate = new Date(dto.startDate);
    const ageDays = this.calculateAgeDays(startDate);
    const stage = this.determineStage(ageDays);

    const flock = this.flockRepository.create({
      barnId: dto.barnId,
      batchCode: dto.batchCode,
      initialCount: dto.initialCount,
      currentCount: dto.currentCount ?? dto.initialCount,
      startDate,
      expectedEndDate: dto.expectedEndDate
        ? new Date(dto.expectedEndDate)
        : undefined,
      avgWeightKg: dto.avgWeightKg ?? 0,
      currentAgeDays: ageDays,
      currentStage: (dto.currentStage as FlockStage) ?? stage,
      notes: dto.notes,
      status: FlockStatus.ACTIVE,
    });

    const savedFlock = await this.flockRepository.save(flock);

    // Cập nhật barn.current_flock = flock.id
    barn.currentFlock = savedFlock.id;
    await this.barnRepository.save(barn);

    return {
      success: true,
      data: savedFlock,
    };
  }

  async updateFlock(id: number, dto: UpdateFlockDto) {
    const flock = await this.flockRepository.findOne({ where: { id } });

    if (!flock) {
      throw new NotFoundException(`Flock với id ${id} không tồn tại`);
    }

    // Cập nhật các field
    if (dto.batchCode !== undefined) flock.batchCode = dto.batchCode;
    if (dto.initialCount !== undefined) flock.initialCount = dto.initialCount;
    if (dto.currentCount !== undefined) flock.currentCount = dto.currentCount;
    if (dto.startDate !== undefined) flock.startDate = new Date(dto.startDate);
    if (dto.expectedEndDate !== undefined) flock.expectedEndDate = new Date(dto.expectedEndDate);
    if (dto.avgWeightKg !== undefined) flock.avgWeightKg = dto.avgWeightKg;
    if (dto.notes !== undefined) flock.notes = dto.notes;

    // Tự tính currentAgeDays từ startDate đến hôm nay
    const ageDays = this.calculateAgeDays(flock.startDate);
    flock.currentAgeDays = ageDays;

    // Tự xác định currentStage theo tuổi
    flock.currentStage = this.determineStage(ageDays);

    const updatedFlock = await this.flockRepository.save(flock);

    return {
      success: true,
      data: updatedFlock,
    };
  }
}
