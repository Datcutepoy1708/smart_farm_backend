import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Flock } from '../../flocks/entities/flock.entity';
import { BarnDevice } from '../../devices/entities/barn-device.entity';

export enum BarnStatus {
  ACTIVE = 'active',
  EMPTY = 'empty',
  MAINTENANCE = 'maintenance',
}

@Entity('barns')
export class Barn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  @Column({ type: 'int', default: 0 })
  capacity: number;

  @Column({ name: 'current_flock', type: 'int', nullable: true })
  currentFlock: number | null;

  @Column({ name: 'batch_name', type: 'varchar', nullable: true })
  batchName: string | null;

  @Column({ name: 'batch_start_date', type: 'timestamp', nullable: true })
  batchStartDate: Date | null;

  @Column({
    type: 'enum',
    enum: BarnStatus,
    default: BarnStatus.EMPTY,
  })
  status: BarnStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.barns)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Flock, (flock) => flock.barn)
  flocks: Flock[];

  @OneToMany(() => BarnDevice, (device) => device.barn)
  devices: BarnDevice[];
}
