import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';
import { Flock } from '../../flocks/entities/flock.entity';
import { BarnDevice } from '../../devices/entities/barn-device.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { TriggerType } from '../../devices/entities/device-log.entity';

@Entity('feed_logs')
export class FeedLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'barn_id' })
  barnId: number;

  @Column({ name: 'flock_id' })
  flockId: number;

  @Column({ name: 'device_id' })
  deviceId: number;

  @Column({ name: 'amount_gram', type: 'int' })
  amountGram: number;

  @Column({
    name: 'triggered_by',
    type: 'enum',
    enum: TriggerType,
    default: TriggerType.MANUAL,
  })
  triggeredBy: TriggerType;

  @Column({ name: 'schedule_id', nullable: true })
  scheduleId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Barn)
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;

  @ManyToOne(() => Flock)
  @JoinColumn({ name: 'flock_id' })
  flock: Flock;

  @ManyToOne(() => BarnDevice)
  @JoinColumn({ name: 'device_id' })
  device: BarnDevice;

  @ManyToOne(() => Schedule, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: Schedule;
}
