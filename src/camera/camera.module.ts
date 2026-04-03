import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CameraService } from './camera.service';
import { CameraController } from './camera.controller';
import { YoloDetectionLog } from './entities/yolo-detection-log.entity';
import { Barn } from '../barns/entities/barn.entity';
import { GatewayModule } from '../gateway/gateway.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([YoloDetectionLog, Barn]),
    GatewayModule,
    AlertsModule,
  ],
  providers: [CameraService],
  controllers: [CameraController],
  exports: [CameraService],
})
export class CameraModule {}
