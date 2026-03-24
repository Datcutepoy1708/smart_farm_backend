import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { FlockStage } from '../../flocks/entities/flock.entity';

@Entity('nutrition_standards')
export class NutritionStandard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: FlockStage,
  })
  stage: FlockStage;

  @Column({ name: 'age_min_days', type: 'int' })
  ageMinDays: number;

  @Column({ name: 'age_max_days', type: 'int' })
  ageMaxDays: number;

  @Column({ name: 'weight_min_kg', type: 'decimal', precision: 5, scale: 3 })
  weightMinKg: number;

  @Column({ name: 'weight_max_kg', type: 'decimal', precision: 5, scale: 3 })
  weightMaxKg: number;

  @Column({ name: 'feed_ratio', type: 'decimal', precision: 5, scale: 2 })
  feedRatio: number;

  @Column({ name: 'protein_pct', type: 'decimal', precision: 5, scale: 2 })
  proteinPct: number;

  @Column({ name: 'energy_kcal_per_kg', type: 'int' })
  energyKcalPerKg: number;

  @Column({ name: 'water_ratio', type: 'decimal', precision: 5, scale: 2 })
  waterRatio: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
