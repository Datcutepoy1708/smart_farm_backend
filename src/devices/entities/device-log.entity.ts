import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';
import { BarnDevice } from './barn-device.entity';
import { User } from '../../auth/entities/user.entity';

export enum TriggerType {
  MANUAL = 'manual',
  SCHEDULE = 'schedule',
  AUTO = 'auto',
}

@Entity('device_logs')
export class DeviceLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'barn_id' })
  barnId: number;

  @Column({ name: 'device_id' })
  deviceId: number;

  @Column()
  action: string; // ON/OFF

  @Column({
    name: 'triggered_by',
    type: 'enum',
    enum: TriggerType,
    default: TriggerType.MANUAL,
  })
  triggeredBy: TriggerType;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Barn)
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;

  @ManyToOne(() => BarnDevice)
  @JoinColumn({ name: 'device_id' })
  device: BarnDevice;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
