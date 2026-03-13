import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FlocksService } from './flocks.service';
import { CreateFlockDto } from './dto/create-flock.dto';
import { UpdateFlockDto } from './dto/update-flock.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class FlocksController {
  constructor(private readonly flocksService: FlocksService) {}

  @Get('barns/:barnId/flocks/active')
  async getActiveFlock(@Param('barnId', ParseIntPipe) barnId: number) {
    return this.flocksService.getActiveFlock(barnId);
  }

  @Get('flocks/:id')
  async getFlockById(@Param('id', ParseIntPipe) id: number) {
    return this.flocksService.getFlockById(id);
  }

  @Post('flocks')
  async createFlock(@Body() dto: CreateFlockDto) {
    return this.flocksService.createFlock(dto);
  }

  @Patch('flocks/:id')
  async updateFlock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFlockDto,
  ) {
    return this.flocksService.updateFlock(id, dto);
  }
}
