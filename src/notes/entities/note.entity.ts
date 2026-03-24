import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Barn } from '../../barns/entities/barn.entity';
import { Flock } from '../../flocks/entities/flock.entity';

export enum NoteTag {
  URGENT = 'urgent',
  ROUTINE = 'routine',
  MEDICAL = 'medical',
  FEEDING = 'feeding',
}

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'barn_id', type: 'int', nullable: true })
  barnId: number | null;

  @Column({ name: 'flock_id', type: 'int', nullable: true })
  flockId: number | null;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: NoteTag,
    default: NoteTag.ROUTINE,
  })
  tag: NoteTag;

  @Column({ name: 'reminder_at', type: 'timestamp', nullable: true })
  reminderAt: Date | null;

  @Column({ name: 'is_reminded', type: 'boolean', default: false })
  isReminded: boolean;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.notes)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Barn)
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;

  @ManyToOne(() => Flock)
  @JoinColumn({ name: 'flock_id' })
  flock: Flock;
}
