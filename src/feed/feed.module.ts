import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';

import { FeedLog } from './entities/feed-log.entity';
import { FeedCalculation } from './entities/feed-calculation.entity';
import { NutritionStandard } from './entities/nutrition-standard.entity';
import { WeightLog } from './entities/weight-log.entity';
import { Barn } from '../barns/entities/barn.entity';
import { Flock } from '../flocks/entities/flock.entity';
import { EnvironmentLog } from '../environment/entities/environment-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FeedLog,
      FeedCalculation,
      NutritionStandard,
      WeightLog,
      Barn,
      Flock,
      EnvironmentLog,
    ]),
  ],
  providers: [FeedService],
  controllers: [FeedController],
  exports: [FeedService],
})
export class FeedModule {}
