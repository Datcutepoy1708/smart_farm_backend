import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BarnsService } from './barns.service';
import { BarnsController } from './barns.controller';
import { Barn } from './entities/barn.entity';
import { EnvironmentLog } from '../environment/entities/environment-log.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { Flock } from '../flocks/entities/flock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Barn, EnvironmentLog, Alert, Flock]),
  ],
  providers: [BarnsService],
  controllers: [BarnsController],
  exports: [BarnsService],
})
export class BarnsModule {}
