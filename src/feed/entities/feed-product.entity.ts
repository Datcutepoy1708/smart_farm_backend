import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';

@Entity('feed_products')
export class FeedProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'barn_id' })
  barnId: number;

  @Column()
  name: string;

  @Column({ name: 'protein_pct', type: 'decimal', precision: 5, scale: 2 })
  proteinPct: number;

  @Column({ name: 'energy_kcal_per_kg', type: 'int' })
  energyKcalPerKg: number;

  @Column({ name: 'calcium_pct', type: 'decimal', precision: 5, scale: 2, nullable: true })
  calciumPct: number;

  @Column({ name: 'fiber_pct', type: 'decimal', precision: 5, scale: 2, nullable: true })
  fiberPct: number;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @Column({ name: 'raw_ai_analysis', type: 'jsonb', nullable: true })
  rawAiAnalysis: any;

  @Column({ name: 'image_url', type: 'varchar', length: 1000, nullable: true })
  imageUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Barn, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;
}
