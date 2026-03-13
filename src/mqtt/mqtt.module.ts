import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MqttService } from './mqtt.service';
import { EnvironmentLog } from '../environment/entities/environment-log.entity';
import { Barn } from '../barns/entities/barn.entity';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([EnvironmentLog, Barn]),
    GatewayModule,
  ],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
