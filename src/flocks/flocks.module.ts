import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlocksService } from './flocks.service';
import { FlocksController } from './flocks.controller';
import { FlocksCron } from './flocks.cron';
import { Flock } from './entities/flock.entity';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Flock]),
    AlertsModule,
  ],
  providers: [FlocksService, FlocksCron],
  controllers: [FlocksController],
  exports: [FlocksService],
})
export class FlocksModule {}
