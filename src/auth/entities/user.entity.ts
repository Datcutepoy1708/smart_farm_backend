import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';
import { Note } from '../../notes/entities/note.entity';
import { FarmAiChat } from '../../farm-ai/entities/farm-ai-chat.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ nullable: true })
  phone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Barn, (barn) => barn.user)
  barns: Barn[];

  @OneToMany(() => Note, (note) => note.user)
  notes: Note[];

  @OneToMany(() => FarmAiChat, (chat) => chat.user)
  farmAiChats: FarmAiChat[];
}
