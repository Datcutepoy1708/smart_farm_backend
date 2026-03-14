import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { FeedCalculation } from './entities/feed-calculation.entity';
import { FeedLog } from './entities/feed-log.entity';
import { NutritionStandard } from './entities/nutrition-standard.entity';
import { Flock, FlockStatus, FlockStage } from '../flocks/entities/flock.entity';
import { EnvironmentLog } from '../environment/entities/environment-log.entity';

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    @InjectRepository(FeedCalculation)
    private readonly feedCalcRepo: Repository<FeedCalculation>,
    @InjectRepository(FeedLog)
    private readonly feedLogRepo: Repository<FeedLog>,
    @InjectRepository(NutritionStandard)
    private readonly nutritionStandardRepo: Repository<NutritionStandard>,
    @InjectRepository(Flock)
    private readonly flockRepo: Repository<Flock>,
    @InjectRepository(EnvironmentLog)
    private readonly environmentLogRepo: Repository<EnvironmentLog>,
  ) {}

  async calculateFeed(barnId: number): Promise<FeedCalculation> {
    // 1. Get ACTIVE flock for barn
    const flock = await this.flockRepo.findOne({
      where: { barnId, status: FlockStatus.ACTIVE },
    });

    if (!flock) {
      throw new NotFoundException(`No active flock found for Barn ${barnId}`);
    }

    if (flock.currentCount <= 0) {
      throw new BadRequestException(`Flock ${flock.id} has 0 chickens`);
    }

    // 2. Extrapolate conditions
    const avgWeightKg = Number(flock.avgWeightKg) || 0;
    const currentCount = flock.currentCount;
    const currentAgeDays = flock.currentAgeDays || 0;

    // 3. Map age to stage
    let stage: FlockStage;
    if (currentAgeDays <= 21) stage = FlockStage.STARTER;
    else if (currentAgeDays <= 35) stage = FlockStage.GROWER;
    else stage = FlockStage.FINISHER;

    // 4. Retrieve NutritionStandard
    const standard = await this.nutritionStandardRepo.findOne({
      where: { stage },
      order: { createdAt: 'DESC' },
    });

    if (!standard) {
      throw new NotFoundException(`No NutritionStandard found for stage ${stage}`);
    }

    // 5. Retrieve newest Environmental Log for temperature
    const latestEnvLog = await this.environmentLogRepo.findOne({
      where: { barnId },
      order: { recordedAt: 'DESC' },
    });

    // Default assume 25°C if no data
    const temp = latestEnvLog?.temperature ?? 25;

    // 6. Calculate Temp Factor
    let tempFactor = 1.0;
    if (temp < 20) tempFactor = 1.10;
    else if (temp >= 20 && temp <= 28) tempFactor = 1.00;
    else if (temp > 28 && temp <= 32) tempFactor = 0.95;
    else if (temp > 32) tempFactor = 0.90;

    // 7. Calculate Recommend Feed & Water
    const feedRatio = Number(standard.feedRatio);
    const baseFeedGram = avgWeightKg * feedRatio * currentCount * 1000;
    const recommendedFeedGram = baseFeedGram * tempFactor;

    const waterRatio = Number(standard.waterRatio || 2.0); // Fallback to 2.0 if missing
    const recommendedWaterLiter = currentCount * waterRatio;

    // 8. Save FeedCalculation
    const calculation = this.feedCalcRepo.create({
      barnId,
      flockId: flock.id,
      standardId: standard.id,
      chickenCount: currentCount,
      avgWeightKg,
      ageDays: currentAgeDays,
      stage,
      envTemperature: temp,
      tempAdjustmentFactor: tempFactor,
      baseFeedGram,
      recommendedFeedGram,
      recommendedWaterLiter,
    });

    const saved = await this.feedCalcRepo.save(calculation);
    
    // Attach relations so caller has access to full standard details
    saved.standard = standard;

    return saved;
  }

  async getFeedToday(barnId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const logs = await this.feedLogRepo.find({
      where: { barnId, createdAt: Between(today, tomorrow) },
      order: { createdAt: 'DESC' }
    });

    const consumedGram = logs.reduce((sum, log) => sum + Number(log.amountGram), 0);

    const latestCalc = await this.feedCalcRepo.findOne({
      where: { barnId },
      order: { calculatedAt: 'DESC' },
      relations: ['standard']
    });

    const recommendedGram = latestCalc ? Number(latestCalc.recommendedFeedGram) : 0;
    const percentage = recommendedGram > 0 ? (consumedGram / recommendedGram) * 100 : 0;

    return {
      consumedGram,
      recommendedGram,
      percentage: Number(percentage.toFixed(1)),
      stage: latestCalc?.stage || 'Unknown',
      nutrition: latestCalc?.standard ? {
        proteinPct: latestCalc.standard.proteinPct,
        energyKcalPerKg: latestCalc.standard.energyKcalPerKg,
      } : null,
      logs,
    };
  }

  async getFeedHistory(barnId: number, days: number = 7) {
    const history: Array<{ date: string; consumedGram: number; recommendedGram: number; percentage: number }> = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    // 1. Fetch latest calculation to mock/interpolate historical recommendations if missing
    const latestCalc = await this.feedCalcRepo.findOne({
      where: { barnId },
      order: { calculatedAt: 'DESC' }
    });
    const fallbackRecommended = latestCalc ? Number(latestCalc.recommendedFeedGram) : 0;

    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);

      const logs = await this.feedLogRepo.find({
        where: {
          barnId,
          createdAt: Between(targetDate, nextDate)
        }
      });
      const consumedGram = logs.reduce((sum, log) => sum + Number(log.amountGram), 0);
      
      const calcOnDate = await this.feedCalcRepo.findOne({
        where: { barnId, calculatedAt: Between(targetDate, nextDate) },
        order: { calculatedAt: 'DESC' } // Last calc of that day
      });

      const recommendedGram = calcOnDate ? Number(calcOnDate.recommendedFeedGram) : fallbackRecommended;
      const percentage = recommendedGram > 0 ? (consumedGram / recommendedGram) * 100 : 0;

      // format exactly as YYYY-MM-DD
      const dateStr = targetDate.toISOString().split('T')[0];

      history.push({
        date: dateStr,
        consumedGram,
        recommendedGram,
        percentage: Number(percentage.toFixed(1))
      });
    }

    return history;
  }
}
