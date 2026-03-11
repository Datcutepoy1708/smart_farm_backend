import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';

export enum FlockStage {
  STARTER = 'starter',
  GROWER = 'grower',
  FINISHER = 'finisher',
}

export enum FlockStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
}

@Entity('flocks')
export class Flock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'barn_id' })
  barnId: number;

  @Column({ name: 'batch_code', unique: true })
  batchCode: string;

  @Column({ name: 'initial_count', type: 'int', default: 0 })
  initialCount: number;

  @Column({ name: 'current_count', type: 'int', default: 0 })
  currentCount: number;

  @Column({ name: 'dead_count', type: 'int', default: 0 })
  deadCount: number;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'expected_end_date', type: 'timestamp', nullable: true })
  expectedEndDate: Date;

  @Column({ name: 'actual_end_date', type: 'timestamp', nullable: true })
  actualEndDate: Date;

  @Column({ name: 'avg_weight_kg', type: 'decimal', precision: 5, scale: 3, default: 0 })
  avgWeightKg: number;

  @Column({ name: 'current_age_days', type: 'int', default: 0 })
  currentAgeDays: number;

  @Column({
    name: 'current_stage',
    type: 'enum',
    enum: FlockStage,
    default: FlockStage.STARTER,
  })
  currentStage: FlockStage;

  @Column({
    type: 'enum',
    enum: FlockStatus,
    default: FlockStatus.ACTIVE,
  })
  status: FlockStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Barn, (barn) => barn.flocks)
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;
}
