import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

// Controllers & Services
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Custom Modules
import { AuthModule } from './auth/auth.module';
import { BarnsModule } from './barns/barns.module';
import { FlocksModule } from './flocks/flocks.module';
import { DevicesModule } from './devices/devices.module';
import { SchedulesModule } from './schedules/schedules.module';
import { FeedModule } from './feed/feed.module';
import { EnvironmentModule } from './environment/environment.module';
import { AlertsModule } from './alerts/alerts.module';
import { NotesModule } from './notes/notes.module';
import { FarmAiModule } from './farm-ai/farm-ai.module';
import { MqttModule } from './mqtt/mqtt.module';

// Gateway
import { EventsGateway } from './gateway/events.gateway';

// Entities
import { User } from './auth/entities/user.entity';
import { Barn } from './barns/entities/barn.entity';
import { Flock } from './flocks/entities/flock.entity';
import { BarnDevice } from './devices/entities/barn-device.entity';
import { BarnSensor } from './devices/entities/barn-sensor.entity';
import { WaterLog } from './devices/entities/water-log.entity';
import { DeviceLog } from './devices/entities/device-log.entity';
import { Schedule } from './schedules/entities/schedule.entity';
import { NutritionStandard } from './feed/entities/nutrition-standard.entity';
import { FeedLog } from './feed/entities/feed-log.entity';
import { FeedCalculation } from './feed/entities/feed-calculation.entity';
import { WeightLog } from './feed/entities/weight-log.entity';
import { EnvironmentLog } from './environment/entities/environment-log.entity';
import { Alert } from './alerts/entities/alert.entity';
import { Note } from './notes/entities/note.entity';
import { FarmAiChat } from './farm-ai/entities/farm-ai-chat.entity';
import { YoloDetectionLog } from './farm-ai/entities/yolo-detection-log.entity';

@Module({
  imports: [
    // Global Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database Configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [
          User,
          Barn,
          Flock,
          BarnDevice,
          BarnSensor,
          WaterLog,
          DeviceLog,
          Schedule,
          NutritionStandard,
          FeedLog,
          FeedCalculation,
          WeightLog,
          EnvironmentLog,
          Alert,
          Note,
          FarmAiChat,
          YoloDetectionLog,
        ],
        synchronize: true, // Auto generate schema from entities
      }),
    }),

    // Global JWT
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') as any,
        },
      }),
    }),

    // Cron Jobs
    ScheduleModule.forRoot(),

    // Business Modules
    AuthModule,
    BarnsModule,
    FlocksModule,
    DevicesModule,
    SchedulesModule,
    FeedModule,
    EnvironmentModule,
    AlertsModule,
    NotesModule,
    FarmAiModule,
    MqttModule,
  ],
  controllers: [AppController],
  providers: [AppService, EventsGateway],
})
export class AppModule {}
