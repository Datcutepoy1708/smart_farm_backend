import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Barn } from '../../barns/entities/barn.entity';

export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity('farm_ai_chats')
export class FarmAiChat {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'barn_id', nullable: true })
  barnId: number;

  @Column({
    type: 'enum',
    enum: ChatRole,
  })
  role: ChatRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'context_data', type: 'jsonb', nullable: true })
  contextData: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Barn)
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;
}
