import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';
import { BarnDevice } from '../../devices/entities/barn-device.entity';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'barn_id' })
  barnId: number;

  @Column({ name: 'device_id' })
  deviceId: number;

  @Column()
  name: string;

  @Column({ name: 'scheduled_time', type: 'varchar', length: 5 })
  scheduledTime: string;

  @Column({ name: 'duration_seconds', type: 'int', default: 30 })
  durationSeconds: number;

  @Column({ name: 'days_of_week', type: 'int', array: true })
  daysOfWeek: number[];

  @Column({ name: 'feed_amount_gram', type: 'int', nullable: true })
  feedAmountGram: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Barn)
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;

  @ManyToOne(() => BarnDevice)
  @JoinColumn({ name: 'device_id' })
  device: BarnDevice;
}
