import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FlocksService } from './flocks.service';
import { FlocksController } from './flocks.controller';
import { Flock } from './entities/flock.entity';
import { Barn } from '../barns/entities/barn.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Flock, Barn]),
  ],
  providers: [FlocksService],
  controllers: [FlocksController],
  exports: [FlocksService],
})
export class FlocksModule {}
