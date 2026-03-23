import { Controller, Get, Post, Put, Param, Body, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BarnsService } from './barns.service';

@Controller('barns')
@UseGuards(AuthGuard('jwt'))
export class BarnsController {
  constructor(private readonly barnsService: BarnsService) {}

  /** GET /api/barns/overview */
  @Get('overview')
  async getOverview(@Request() req: any) {
    const userId: number = req.user.userId;
    return this.barnsService.getOverview(userId);
  }

  /** GET /api/barns */
  @Get()
  async getAll(@Request() req: any) {
    return this.barnsService.getAll(req.user.userId);
  }

  /** GET /api/barns/:id */
  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.barnsService.getOne(id, req.user.userId);
  }

  /** POST /api/barns */
  @Post()
  async create(@Body() body: { name: string; location?: string; capacity?: number }, @Request() req: any) {
    return this.barnsService.create(req.user.userId, body);
  }

  /** PUT /api/barns/:id */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; location?: string; capacity?: number; status?: any },
    @Request() req: any,
  ) {
    return this.barnsService.update(id, req.user.userId, body);
  }
}

