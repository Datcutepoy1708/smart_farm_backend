import { Controller, Post, Param, ParseIntPipe } from '@nestjs/common';
import { FlocksService } from './flocks.service';

@Controller('flocks')
export class FlocksController {
  constructor(private readonly flocksService: FlocksService) {}

  @Post(':id/complete')
  async completeFlock(@Param('id', ParseIntPipe) id: number) {
    return this.flocksService.completeFlock(id);
  }
}
