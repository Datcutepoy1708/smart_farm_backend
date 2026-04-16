import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MqttService } from './mqtt.service';
import { EnvironmentLog } from '../environment/entities/environment-log.entity';
import { Barn } from '../barns/entities/barn.entity';
import { BarnDevice } from '../devices/entities/barn-device.entity';
import { FeedLog } from '../feed/entities/feed-log.entity';
import { Flock } from '../flocks/entities/flock.entity';
import { DeviceLog } from '../devices/entities/device-log.entity';
import { GatewayModule } from '../gateway/gateway.module';
import { AlertsModule } from '../alerts/alerts.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      EnvironmentLog,
      Barn,
      BarnDevice,
      FeedLog,
      Flock,
      DeviceLog,
    ]),
    GatewayModule,
    AlertsModule,
    NotificationsModule,
  ],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
