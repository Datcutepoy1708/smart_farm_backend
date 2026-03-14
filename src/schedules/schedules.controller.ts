import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('barns/:barnId/schedules')
  async getSchedules(@Param('barnId', ParseIntPipe) barnId: number) {
    const data = await this.schedulesService.getSchedules(barnId);
    return { success: true, data };
  }

  @Get('schedules/:id')
  async getScheduleById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.schedulesService.getScheduleById(id);
    return { success: true, data };
  }

  @Post('schedules')
  async createSchedule(@Body() createScheduleDto: CreateScheduleDto) {
    const data = await this.schedulesService.createSchedule(createScheduleDto);
    return { success: true, data };
  }

  @Patch('schedules/:id')
  async updateSchedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    const data = await this.schedulesService.updateSchedule(id, updateScheduleDto);
    return { success: true, data };
  }

  @Delete('schedules/:id')
  async deleteSchedule(@Param('id', ParseIntPipe) id: number) {
    await this.schedulesService.deleteSchedule(id);
    return { success: true, data: { message: 'Schedule deleted successfully' } };
  }
}
