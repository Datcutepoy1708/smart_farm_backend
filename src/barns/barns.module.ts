import { Module } from '@nestjs/common';
import { BarnsService } from './barns.service';
import { BarnsController } from './barns.controller';

@Module({
  providers: [BarnsService],
  controllers: [BarnsController],
})
export class BarnsModule {}
