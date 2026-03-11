import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';
import { Flock } from '../../flocks/entities/flock.entity';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertType {
  HIGH_TEMP = 'high_temp',
  LOW_TEMP = 'low_temp',
  HIGH_HUMIDITY = 'high_humidity',
  ABNORMAL_BEHAVIOR = 'abnormal_behavior',
  CHICKEN_INACTIVE = 'chicken_inactive',
  FLOCK_CLUSTERING = 'flock_clustering',
  COUNT_DROP = 'count_drop',
  SENSOR_OFFLINE = 'sensor_offline',
  DEVICE_ERROR = 'device_error',
  NOT_EATING = 'not_eating',
  FEED_EMPTY = 'feed_empty',
  LOW_WATER = 'low_water',
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'barn_id' })
  barnId: number;

  @Column({ name: 'flock_id', nullable: true })
  flockId: number;

  @Column({
    name: 'alert_type',
    type: 'enum',
    enum: AlertType,
  })
  alertType: AlertType;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.INFO,
  })
  severity: AlertSeverity;

  @Column()
  message: string;

  @Column({ name: 'detail_data', type: 'jsonb', nullable: true })
  detailData: any;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Barn)
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;

  @ManyToOne(() => Flock)
  @JoinColumn({ name: 'flock_id' })
  flock: Flock;
}
