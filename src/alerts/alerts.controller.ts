import { Controller, Get, Param, Patch, ParseIntPipe, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller()
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('barns/:barnId/alerts')
  async getAlerts(
    @Param('barnId', ParseIntPipe) barnId: number,
    @Query('limit') limit?: number,
  ) {
    return this.alertsService.getAlerts(barnId, limit ? Number(limit) : 20);
  }

  @Get('barns/:barnId/alerts/unread-count')
  async getUnreadCount(@Param('barnId', ParseIntPipe) barnId: number) {
    const count = await this.alertsService.getUnreadCount(barnId);
    return { unreadCount: count };
  }

  @Patch('alerts/:id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.alertsService.markAsRead(id);
  }

  @Patch('barns/:barnId/alerts/read-all')
  async markAllAsRead(@Param('barnId', ParseIntPipe) barnId: number) {
    await this.alertsService.markAllAsRead(barnId);
    return { success: true };
  }
}
