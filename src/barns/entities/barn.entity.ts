import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
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

  @Column({ name: 'user_id' })
  userId: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'int', default: 0 })
  capacity: number;

  @Column({ name: 'current_flock', nullable: true })
  currentFlock: number;

  @Column({ name: 'batch_name', nullable: true })
  batchName: string;

  @Column({ name: 'batch_start_date', type: 'timestamp', nullable: true })
  batchStartDate: Date;

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
