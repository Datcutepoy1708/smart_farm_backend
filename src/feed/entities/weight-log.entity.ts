import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';
import { Flock } from '../../flocks/entities/flock.entity';

@Entity('weight_logs')
export class WeightLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: bigint;

  @Column({ name: 'barn_id' })
  barnId: number;

  @ManyToOne(() => Barn, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;

  @Column({ name: 'flock_id', nullable: true, type: 'int' })
  flockId: number | null;

  @ManyToOne(() => Flock, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'flock_id' })
  flock: Flock | null;

  @Column({ 
    name: 'total_weight_kg', 
    type: 'float' 
  })
  totalWeightKg: number;

  @Column({ 
    name: 'sample_count', 
    type: 'int', 
    default: 10 
  })
  sampleCount: number;

  @Column({ 
    name: 'avg_weight_kg', 
    type: 'float' 
  })
  avgWeightKg: number;

  @Column({ 
    name: 'age_days', 
    type: 'int', 
    nullable: true 
  })
  ageDays: number | null;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;
}
