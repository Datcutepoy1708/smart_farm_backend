import { Controller, Post, Get, Param, ParseIntPipe } from '@nestjs/common';
import { FlocksService } from './flocks.service';

@Controller('flocks')
export class FlocksController {
  constructor(private readonly flocksService: FlocksService) {}

  @Get('barn/:barnId')
  async getBarnFlocks(@Param('barnId', ParseIntPipe) barnId: number) {
    return this.flocksService.getBarnFlocks(barnId);
  }

  @Post(':id/complete')
  async completeFlock(@Param('id', ParseIntPipe) id: number) {
    return this.flocksService.completeFlock(id);
  }
}
