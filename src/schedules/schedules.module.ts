import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';

import { Schedule } from './entities/schedule.entity';
import { BarnDevice } from '../devices/entities/barn-device.entity';
import { DeviceLog } from '../devices/entities/device-log.entity';
import { FeedLog } from '../feed/entities/feed-log.entity';
import { Flock } from '../flocks/entities/flock.entity';

import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      BarnDevice,
      DeviceLog,
      FeedLog,
      Flock,
    ]),
    MqttModule,
  ],
  providers: [SchedulesService],
  controllers: [SchedulesController],
  exports: [SchedulesService]
})
export class SchedulesModule {}
