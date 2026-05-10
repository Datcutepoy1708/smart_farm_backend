import { Controller, Post, Get, Param, ParseIntPipe, Body } from '@nestjs/common';
import { FlocksService } from './flocks.service';
import { CreateFlockDto } from './dto/create-flock.dto';
import { MortalityDto } from './dto/mortality.dto';
import { AddChickensDto } from './dto/add-chickens.dto';

@Controller('flocks')
export class FlocksController {
  constructor(private readonly flocksService: FlocksService) {}

  @Get('barn/:barnId')
  async getBarnFlocks(@Param('barnId', ParseIntPipe) barnId: number) {
    return this.flocksService.getBarnFlocks(barnId);
  }

  @Post()
  async create(@Body() createFlockDto: CreateFlockDto) {
    return this.flocksService.createFlock(createFlockDto);
  }

  @Post('barn/:barnId/mortality')
  async logMortality(
    @Param('barnId', ParseIntPipe) barnId: number,
    @Body() mortalityDto: MortalityDto,
  ) {
    return this.flocksService.logMortality(barnId, mortalityDto);
  }

  @Post('barn/:barnId/add')
  async addChickens(
    @Param('barnId', ParseIntPipe) barnId: number,
    @Body() addChickensDto: AddChickensDto,
  ) {
    return this.flocksService.addChickens(barnId, addChickensDto);
  }

  @Post(':id/complete')
  async completeFlock(@Param('id', ParseIntPipe) id: number) {
    return this.flocksService.completeFlock(id);
  }
}
