import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';

@Entity('yolo_detection_logs')
export class YoloDetectionLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'barn_id', type: 'int' })
  barnId: number;

  @Column({ name: 'flock_id', type: 'int', nullable: true })
  flockId: number | null;

  @Column({ name: 'chicken_count', type: 'int', default: 0 })
  chickenCount: number;

  @Column({ name: 'abnormal_count', type: 'int', default: 0 })
  abnormalCount: number;

  @Column({ type: 'jsonb', nullable: true })
  behaviors: Record<string, unknown> | null;

  @Column({
    name: 'confidence_avg',
    type: 'float',
    nullable: true,
  })
  confidenceAvg: number | null;

  @Column({ name: 'image_path', type: 'varchar', nullable: true })
  imagePath: string | null;

  @Column({ name: 'is_abnormal', type: 'boolean', default: false })
  isAbnormal: boolean;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;

  @ManyToOne(() => Barn)
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;
}
