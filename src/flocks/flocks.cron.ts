import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flock, FlockStatus, FlockStage } from './entities/flock.entity';
import { AlertsService } from '../alerts/alerts.service';
import { AlertSeverity, AlertType } from '../alerts/entities/alert.entity';

@Injectable()
export class FlocksCron {
  private readonly logger = new Logger(FlocksCron.name);

  constructor(
    @InjectRepository(Flock)
    private readonly flockRepo: Repository<Flock>,
    private readonly alertsService: AlertsService,
  ) {}

  // Chạy tự động vào 12h đêm mỗi ngày
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyFlockUpdate() {
    this.logger.log('Starting daily flock age update...');
    
    // Lấy tất cả đàn gà đang hoạt động
    const activeFlocks = await this.flockRepo.find({
      where: { status: FlockStatus.ACTIVE },
    });

    const now = new Date();

    for (const flock of activeFlocks) {
      if (!flock.startDate) continue;

      // Tính số ngày tuổi
      const diffTime = Math.abs(now.getTime() - flock.startDate.getTime());
      const ageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      flock.currentAgeDays = ageDays;

      // Cập nhật giai đoạn
      if (ageDays <= 21) {
        flock.currentStage = FlockStage.STARTER;
      } else if (ageDays <= 35) {
        flock.currentStage = FlockStage.GROWER;
      } else {
        flock.currentStage = FlockStage.FINISHER;
      }

      await this.flockRepo.save(flock);
      this.logger.log(`Updated Flock ${flock.id} - Age: ${ageDays} days, Stage: ${flock.currentStage}`);

      // Nếu đạt 45 ngày tuổi, gửi cảnh báo xuất chuồng
      // Lưu ý: Chỉ gửi nếu đúng ngày 45 để tránh spam mỗi ngày
      if (ageDays === 45) {
        await this.alertsService.createAlert(
          flock.barnId,
          AlertType.FLOCK_READY,
          AlertSeverity.INFO,
          `Đàn gà ở lứa ${flock.batchCode} đã đạt 45 ngày tuổi (giai đoạn Finisher). Đã đến lúc chuẩn bị xuất chuồng!`,
          { flockId: flock.id, ageDays }
        );
        this.logger.log(`Emitted FLOCK_READY alert for Flock ${flock.id}`);
      }
    }
    
    this.logger.log('Finished daily flock update.');
  }
}
