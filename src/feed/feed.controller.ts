import { Controller, Get, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { FeedService } from './feed.service';

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
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number
  ) {
    return this.feedService.getFeedHistory(barnId, days);
  }
}
