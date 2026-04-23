import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BarnsService } from './barns.service';
import { MqttService } from '../mqtt/mqtt.service';

@Controller('barns')
@UseGuards(AuthGuard('jwt'))
export class BarnsController {
  constructor(
    private readonly barnsService: BarnsService,
    private readonly mqttService: MqttService,
  ) { }

  /** GET /api/barns/overview */
  @Get('overview')
  async getOverview(@Request() req: any) {
    const userId: number = req.user.userId;
    return this.barnsService.getOverview(userId);
  }

  /** GET /api/barns */
  @Get()
  async getAll(@Request() req: any) {
    return this.barnsService.getAll(req.user.userId);
  }

  /** GET /api/barns/:id */
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.barnsService.getOne(id, req.user.userId);
  }

  /** POST /api/barns */
  @Post()
  async create(
    @Body() body: { name: string; location?: string; capacity?: number },
    @Request() req: any,
  ) {
    return this.barnsService.create(req.user.userId, body);
  }

  /** PUT /api/barns/:id */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: { name?: string; location?: string; capacity?: number; status?: any },
    @Request() req: any,
  ) {
    return this.barnsService.update(id, req.user.userId, body);
  }

  /**
   * POST /api/barns/:barnId/scale-calibration
   * Body: { factor?: number, knownWeightKg?: number }
   * - factor: Đặt hệ số scale trực tiếp
   * - knownWeightKg: Khởi động auto-calibration với vật nặng đã biết
   */
  @Post(':barnId/scale-calibration')
  async setScaleCalibration(
    @Param('barnId', ParseIntPipe) barnId: number,
    @Body() body: { factor?: number; knownWeightKg?: number },
  ) {
    if (body.knownWeightKg !== undefined && body.knownWeightKg > 0) {
      // Auto-calibration: ESP32 tự tính toán khi có vật nặng trên cân
      this.mqttService.publishControl(barnId, 'CALIBRATE_SCALE', {
        knownWeightKg: body.knownWeightKg,
      });
      return {
        success: true,
        message: `Đã gửi lệnh auto-calibration với vật nặng ${body.knownWeightKg}kg về Chuồng ${barnId}`,
        barnId,
        knownWeightKg: body.knownWeightKg,
      };
    }

    if (body.factor !== undefined && body.factor > 0) {
      // Đặt hệ số scale trực tiếp
      this.mqttService.publishControl(barnId, 'SET_SCALE', {
        factor: body.factor,
      });
      return {
        success: true,
        message: `Đã cập nhật hệ số cân thành ${body.factor} cho Chuồng ${barnId}`,
        barnId,
        factor: body.factor,
      };
    }

    return { success: false, message: 'Cần truyền factor hoặc knownWeightKg' };
  }
}
