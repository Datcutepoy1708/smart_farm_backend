import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import { RecordWeightDto } from './dto/record-weight.dto';

@Controller('barns/:barnId/feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('calculate')
  async calculateFeed(@Param('barnId', ParseIntPipe) barnId: number) {
    return this.feedService.calculateFeed(barnId);
  }

  @Get('today')
  async getFeedToday(@Param('barnId', ParseIntPipe) barnId: number) {
    return this.feedService.getFeedToday(barnId);
  }

  @Get('history')
  async getFeedHistory(
    @Param('barnId', ParseIntPipe) barnId: number,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    return this.feedService.getFeedHistory(barnId, days);
  }

  /**
   * POST /barns/:barnId/feed/weight-log
   * Ghi cân nặng mẫu → cập nhật avgWeightKg của flock
   * Body: { totalWeightKg, sampleCount, ageDays? }
   */
  @Post('weight-log')
  async recordWeight(
    @Param('barnId', ParseIntPipe) barnId: number,
    @Body() dto: RecordWeightDto,
  ) {
    return this.feedService.recordWeight(barnId, dto);
  }

  /**
   * GET /barns/:barnId/feed/weight-logs
   * Lấy lịch sử cân nặng mẫu (10 bản ghi gần nhất)
   */
  @Get('weight-logs')
  async getWeightLogs(
    @Param('barnId', ParseIntPipe) barnId: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.feedService.getWeightLogs(barnId, limit);
  }
}
