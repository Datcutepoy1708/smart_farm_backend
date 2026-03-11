import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';
import { Flock, FlockStage } from '../../flocks/entities/flock.entity';
import { NutritionStandard } from './nutrition-standard.entity';

@Entity('feed_calculations')
export class FeedCalculation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'barn_id' })
  barnId: number;

  @Column({ name: 'flock_id' })
  flockId: number;

  @Column({ name: 'standard_id' })
  standardId: number;

  @Column({ name: 'chicken_count', type: 'int' })
  chickenCount: number;

  @Column({ name: 'avg_weight_kg', type: 'decimal', precision: 5, scale: 3 })
  avgWeightKg: number;

  @Column({ name: 'age_days', type: 'int' })
  ageDays: number;

  @Column({
    type: 'enum',
    enum: FlockStage,
  })
  stage: FlockStage;

  @Column({ name: 'env_temperature', type: 'decimal', precision: 4, scale: 2 })
  envTemperature: number;

  @Column({ name: 'temp_adjustment_factor', type: 'decimal', precision: 4, scale: 2, default: 1.0 })
  tempAdjustmentFactor: number;

  @Column({ name: 'base_feed_gram', type: 'decimal', precision: 10, scale: 2 })
  baseFeedGram: number;

  @Column({ name: 'recommended_feed_gram', type: 'decimal', precision: 10, scale: 2 })
  recommendedFeedGram: number;

  @Column({ name: 'recommended_water_liter', type: 'decimal', precision: 10, scale: 2 })
  recommendedWaterLiter: number;

  @CreateDateColumn({ name: 'calculated_at' })
  calculatedAt: Date;

  @ManyToOne(() => Barn)
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;

  @ManyToOne(() => Flock)
  @JoinColumn({ name: 'flock_id' })
  flock: Flock;

  @ManyToOne(() => NutritionStandard)
  @JoinColumn({ name: 'standard_id' })
  standard: NutritionStandard;
}
