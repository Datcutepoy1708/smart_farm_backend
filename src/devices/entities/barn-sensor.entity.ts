import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Barn } from '../../barns/entities/barn.entity';

export enum SensorType {
  DHT22 = 'dht22',
  LOAD_CELL = 'load_cell',
  WATER_LEVEL = 'water_level',
  ESP32CAM = 'esp32cam',
}

@Entity('barn_sensors')
export class BarnSensor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'barn_id' })
  barnId: number;

  @ManyToOne(() => Barn, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'barn_id' })
  barn: Barn;

  @Column({
    type: 'enum',
    enum: SensorType,
  })
  sensorType: SensorType;

  @Column({ name: 'name', nullable: true, type: 'varchar' })
  name: string | null;

  @Column({ name: 'mqtt_topic' })
  mqttTopic: string;

  @Column({ 
    name: 'calibration_offset', 
    type: 'float', 
    default: 0.0 
  })
  calibrationOffset: number;

  @Column({ 
    name: 'is_active', 
    type: 'boolean', 
    default: true 
  })
  isActive: boolean;

  @Column({ 
    name: 'last_seen_at', 
    type: 'timestamp', 
    nullable: true 
  })
  lastSeenAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
