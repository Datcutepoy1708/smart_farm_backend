import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { BarnsService } from './barns.service';
import { CreateBarnDto } from './dto/create-barn.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface RequestUser {
  userId: number;
  email: string;
}

@Controller('barns')
@UseGuards(JwtAuthGuard)
export class BarnsController {
  constructor(private readonly barnsService: BarnsService) {}

  @Get()
  async getBarns(@CurrentUser() user: RequestUser) {
    return this.barnsService.getBarns(user.userId);
  }

  @Get('overview')
  async getFarmOverview(@CurrentUser() user: RequestUser) {
    return this.barnsService.getFarmOverview(user.userId);
  }

  @Get(':id')
  async getBarnById(@Param('id', ParseIntPipe) id: number) {
    return this.barnsService.getBarnById(id);
  }

  @Post()
  async createBarn(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateBarnDto,
  ) {
    return this.barnsService.createBarn(user.userId, dto);
  }
}
