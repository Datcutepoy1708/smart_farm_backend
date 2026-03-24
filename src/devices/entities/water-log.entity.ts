import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';
import { BarnDevice } from './barn-device.entity';

export enum WaterTriggeredBy {
  SCHEDULE = 'schedule',
  MANUAL = 'manual',
  AUTO = 'auto',
}

@Entity('water_logs')
export class WaterLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: bigint;

  @Column({ name: 'barn_id' })
  barnId: number;

  @ManyToOne(() => Barn, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;

  @Column({ name: 'device_id', nullable: true, type: 'int' })
  deviceId: number | null;

  @ManyToOne(() => BarnDevice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'device_id' })
  device: BarnDevice | null;

  @Column({
    name: 'duration_seconds',
    nullable: true,
    type: 'int',
  })
  durationSeconds: number | null;

  @Column({
    name: 'water_level_before',
    nullable: true,
    type: 'float',
  })
  waterLevelBefore: number | null;

  @Column({
    name: 'water_level_after',
    nullable: true,
    type: 'float',
  })
  waterLevelAfter: number | null;

  @Column({
    name: 'triggered_by',
    type: 'enum',
    enum: WaterTriggeredBy,
    default: WaterTriggeredBy.SCHEDULE,
  })
  triggeredBy: WaterTriggeredBy;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
