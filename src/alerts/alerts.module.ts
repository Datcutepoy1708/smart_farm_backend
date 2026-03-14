import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { Alert } from './entities/alert.entity';
import { Barn } from '../barns/entities/barn.entity';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, Barn]),
    GatewayModule
  ],
  providers: [AlertsService],
  controllers: [AlertsController],
  exports: [AlertsService]
})
export class AlertsModule {}
