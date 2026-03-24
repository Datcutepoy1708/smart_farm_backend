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

@Entity('yolo_detection_logs')
export class YoloDetectionLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'barn_id' })
  barnId: number;

  @Column({ name: 'flock_id', nullable: true })
  flockId: number;

  @Column({ name: 'chicken_count', type: 'int', default: 0 })
  chickenCount: number;

  @Column({ name: 'abnormal_count', type: 'int', default: 0 })
  abnormalCount: number;

  @Column({ type: 'jsonb', nullable: true })
  behaviors: any;

  @Column({
    name: 'confidence_avg',
    type: 'decimal',
    precision: 4,
    scale: 3,
    default: 0,
  })
  confidenceAvg: number;

  @Column({ name: 'image_path', nullable: true })
  imagePath: string;

  @Column({ name: 'is_abnormal', default: false })
  isAbnormal: boolean;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;

  @ManyToOne(() => Barn)
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;

  @ManyToOne(() => Flock)
  @JoinColumn({ name: 'flock_id' })
  flock: Flock;
}
