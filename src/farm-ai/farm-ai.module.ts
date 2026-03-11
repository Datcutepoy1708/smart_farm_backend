import { Module } from '@nestjs/common';
import { FarmAiService } from './farm-ai.service';
import { FarmAiController } from './farm-ai.controller';

@Module({
  providers: [FarmAiService],
  controllers: [FarmAiController],
})
export class FarmAiModule {}
