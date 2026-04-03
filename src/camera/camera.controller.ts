import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CameraService } from './camera.service';
import { CreateDetectionDto } from './dto/create-detection.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { YoloDetectionLog } from './entities/yolo-detection-log.entity';

interface SuccessResponse<T> {
  success: boolean;
  data: T;
}

@Controller('camera')
export class CameraController {
  constructor(private readonly cameraService: CameraService) {}

  /**
   * GET /camera/barns/:barnId/latest
   * Lấy detection mới nhất của một chuồng
   */
  @UseGuards(JwtAuthGuard)
  @Get('barns/:barnId/latest')
  async getLatestDetection(
    @Param('barnId', ParseIntPipe) barnId: number,
  ): Promise<SuccessResponse<YoloDetectionLog | null>> {
    const data = await this.cameraService.getLatestDetection(barnId);
    return { success: true, data };
  }

  /**
   * GET /camera/barns/:barnId/stats?hours=24
   * Thống kê detection trong N giờ gần nhất
   */
  @UseGuards(JwtAuthGuard)
  @Get('barns/:barnId/stats')
  async getDetectionStats(
    @Param('barnId', ParseIntPipe) barnId: number,
    @Query('hours') hours?: string,
  ): Promise<SuccessResponse<Awaited<ReturnType<CameraService['getDetectionStats']>>>> {
    const data = await this.cameraService.getDetectionStats(
      barnId,
      hours ? Number(hours) : 24,
    );
    return { success: true, data };
  }

  /**
   * GET /camera/barns/:barnId/history?limit=20
   * Lịch sử detection theo barnId
   */
  @UseGuards(JwtAuthGuard)
  @Get('barns/:barnId/history')
  async getDetectionHistory(
    @Param('barnId', ParseIntPipe) barnId: number,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponse<YoloDetectionLog[]>> {
    const data = await this.cameraService.getDetectionHistory(
      barnId,
      limit ? Number(limit) : 20,
    );
    return { success: true, data };
  }

  /**
   * GET /camera/barns/:barnId/daily?days=7
   * Thống kê theo ngày trong N ngày gần nhất
   */
  @UseGuards(JwtAuthGuard)
  @Get('barns/:barnId/daily')
  async getDetectionByDay(
    @Param('barnId', ParseIntPipe) barnId: number,
    @Query('days') days?: string,
  ): Promise<SuccessResponse<Awaited<ReturnType<CameraService['getDetectionByDay']>>>> {
    const data = await this.cameraService.getDetectionByDay(
      barnId,
      days ? Number(days) : 7,
    );
    return { success: true, data };
  }

  /**
   * POST /camera/detect
   * Nhận kết quả từ Python YOLO server (dùng API key, không cần JWT)
   * Header: X-API-Key: smart_farm_yolo_key_2026
   */
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('detect')
  async createDetection(
    @Body() dto: CreateDetectionDto,
  ): Promise<SuccessResponse<YoloDetectionLog>> {
    const data = await this.cameraService.createDetection(dto);
    return { success: true, data };
  }
}
