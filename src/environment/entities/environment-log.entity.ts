import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';

@Entity('environment_logs')
export class EnvironmentLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: bigint;

  @Column({ name: 'barn_id' })
  barnId: number;

  @ManyToOne(() => Barn, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;

  @Column({ type: 'float' })
  temperature: number;

  @Column({ type: 'float' })
  humidity: number;

  @Column({ type: 'jsonb', nullable: true })
  rawData: any;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;
}
