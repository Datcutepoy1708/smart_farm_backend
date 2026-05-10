import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flock, FlockStatus, FlockStage } from './entities/flock.entity';
import { Barn, BarnStatus } from '../barns/entities/barn.entity';
import { CreateFlockDto } from './dto/create-flock.dto';
import { MortalityDto } from './dto/mortality.dto';
import { AddChickensDto } from './dto/add-chickens.dto';

@Injectable()
export class FlocksService {
  constructor(
    @InjectRepository(Flock)
    private readonly flockRepo: Repository<Flock>,
    @InjectRepository(Barn)
    private readonly barnRepo: Repository<Barn>,
  ) {}

  async getBarnFlocks(barnId: number): Promise<Flock[]> {
    return this.flockRepo.find({
      where: { barnId },
      order: { id: 'DESC' },
    });
  }

  async createFlock(dto: CreateFlockDto): Promise<Flock> {
    const barn = await this.barnRepo.findOne({ where: { id: dto.barnId } });
    if (!barn) {
      throw new NotFoundException(`Barn with ID ${dto.barnId} not found`);
    }

    const activeFlock = await this.flockRepo.findOne({
      where: { barnId: dto.barnId, status: FlockStatus.ACTIVE },
    });

    if (activeFlock) {
      throw new Error(`Barn ${dto.barnId} already has an active flock`);
    }

    const batchCode = dto.batchCode || `BATCH-${new Date().getFullYear()}-${dto.barnId}-${Date.now().toString().slice(-4)}`;

    const flock = this.flockRepo.create({
      barnId: dto.barnId,
      batchCode,
      initialCount: dto.initialCount,
      currentCount: dto.initialCount,
      deadCount: 0,
      startDate: new Date(),
      status: FlockStatus.ACTIVE,
      currentStage: FlockStage.STARTER,
      avgWeightKg: 0.05, // Khởi tạo 50g cho gà con
    });

    const savedFlock = await this.flockRepo.save(flock);

    barn.status = BarnStatus.ACTIVE;
    barn.currentFlock = savedFlock.id;
    barn.batchName = batchCode;
    barn.batchStartDate = savedFlock.startDate;
    await this.barnRepo.save(barn);

    return savedFlock;
  }

  async logMortality(barnId: number, dto: MortalityDto): Promise<Flock> {
    const activeFlock = await this.flockRepo.findOne({
      where: { barnId, status: FlockStatus.ACTIVE },
    });

    if (!activeFlock) {
      throw new NotFoundException(`No active flock found in Barn ${barnId}`);
    }

    activeFlock.deadCount += dto.deadCount;
    activeFlock.currentCount -= dto.deadCount;
    if (activeFlock.currentCount < 0) activeFlock.currentCount = 0;

    return this.flockRepo.save(activeFlock);
  }

  async addChickens(barnId: number, dto: AddChickensDto): Promise<Flock> {
    const activeFlock = await this.flockRepo.findOne({
      where: { barnId, status: FlockStatus.ACTIVE },
    });

    if (!activeFlock) {
      throw new NotFoundException(`No active flock found in Barn ${barnId}`);
    }

    activeFlock.currentCount += dto.addCount;
    activeFlock.initialCount += dto.addCount; // Cập nhật cả tổng ban đầu để tỷ lệ sống sót chính xác

    return this.flockRepo.save(activeFlock);
  }

  async completeFlock(id: number): Promise<Flock> {
    const flock = await this.flockRepo.findOne({ where: { id } });
    if (!flock) {
      throw new NotFoundException(`Flock with ID ${id} not found`);
    }

    flock.status = FlockStatus.COMPLETED;
    flock.actualEndDate = new Date();
    const savedFlock = await this.flockRepo.save(flock);
    
    // Update Barn
    const barn = await this.barnRepo.findOne({ where: { id: flock.barnId } });
    if (barn) {
      barn.status = BarnStatus.EMPTY;
      barn.currentFlock = null;
      await this.barnRepo.save(barn);
    }

    return savedFlock;
  }
}
