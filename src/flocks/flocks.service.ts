import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flock, FlockStatus } from './entities/flock.entity';

@Injectable()
export class FlocksService {
  constructor(
    @InjectRepository(Flock)
    private readonly flockRepo: Repository<Flock>,
  ) {}

  async getBarnFlocks(barnId: number): Promise<Flock[]> {
    return this.flockRepo.find({
      where: { barnId },
      order: { id: 'DESC' },
    });
  }

  async completeFlock(id: number): Promise<Flock> {
    const flock = await this.flockRepo.findOne({ where: { id } });
    if (!flock) {
      throw new NotFoundException(`Flock with ID ${id} not found`);
    }

    flock.status = FlockStatus.COMPLETED;
    flock.actualEndDate = new Date();
    
    return this.flockRepo.save(flock);
  }
}
