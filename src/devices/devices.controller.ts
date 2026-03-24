import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ControlDeviceDto } from './dto/control-device.dto';
import { CreateDeviceDto } from './dto/create-device.dto';

interface RequestUser {
  userId: number;
  email: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get('barns/:barnId/devices')
  async getDevices(@Param('barnId', ParseIntPipe) barnId: number) {
    const data = await this.devicesService.getDevices(barnId);
    return { success: true, data };
  }

  @Post('barns/:barnId/devices')
  async createDevice(
    @Param('barnId', ParseIntPipe) barnId: number,
    @Body() dto: CreateDeviceDto,
  ) {
    const data = await this.devicesService.createDevice(barnId, dto);
    return { success: true, data };
  }

  @Get('devices/:id')
  async getDeviceById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.devicesService.getDeviceById(id);
    return { success: true, data };
  }

  @Post('devices/:id/control')
  async controlDevice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ControlDeviceDto,
    @CurrentUser() user: RequestUser,
  ) {
    const data = await this.devicesService.controlDevice(
      id,
      dto.action,
      user.userId,
    );
    return { success: true, data };
  }

  @Get('devices/:id/logs')
  async getDeviceLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limitStr?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    const data = await this.devicesService.getDeviceLogs(id, limit);
    return { success: true, data };
  }
}
