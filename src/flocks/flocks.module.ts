import { Module } from '@nestjs/common';
import { FlocksService } from './flocks.service';
import { FlocksController } from './flocks.controller';

@Module({
  providers: [FlocksService],
  controllers: [FlocksController],
})
export class FlocksModule {}
