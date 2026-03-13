import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';

export enum DeviceType {
  FEEDER = 'feeder',
  WATER = 'water',
  FAN = 'fan',
  HEATER = 'heater',
  WASHER = 'washer',
}

export enum DeviceStatus {
  ON = 'ON',
  OFF = 'OFF',
}

@Entity('barn_devices')
export class BarnDevice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'barn_id' })
  barnId: number;

  @Column()
  name: string;

  @Column({
    name: 'device_type',
    type: 'enum',
    enum: DeviceType,
  })
  deviceType: string;

  @Column({ name: 'mqtt_topic' })
  mqttTopic: string;

  @Column({
    name: 'current_status',
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.OFF,
  })
  currentStatus: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Barn, (barn) => barn.devices)
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;
}
