import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FarmAiService } from './farm-ai.service';
import { FarmAiController } from './farm-ai.controller';
import { FarmAiChat } from './entities/farm-ai-chat.entity';
import { Barn } from '../barns/entities/barn.entity';
import { Flock } from '../flocks/entities/flock.entity';
import { EnvironmentLog } from '../environment/entities/environment-log.entity';
import { FeedCalculation } from '../feed/entities/feed-calculation.entity';
import { FeedLog } from '../feed/entities/feed-log.entity';
import { Alert } from '../alerts/entities/alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FarmAiChat,
      Barn,
      Flock,
      EnvironmentLog,
      FeedCalculation,
      FeedLog,
      Alert,
    ]),
  ],
  providers: [FarmAiService],
  controllers: [FarmAiController],
  exports: [FarmAiService],
})
export class FarmAiModule {}
