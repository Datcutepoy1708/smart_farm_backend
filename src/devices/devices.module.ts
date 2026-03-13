import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { BarnDevice } from './entities/barn-device.entity';
import { DeviceLog } from './entities/device-log.entity';
import { Barn } from '../barns/entities/barn.entity';
import { GatewayModule } from '../gateway/gateway.module';
import { MqttModule } from '../mqtt/mqtt.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BarnDevice, DeviceLog, Barn]),
    GatewayModule,
    MqttModule,
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
