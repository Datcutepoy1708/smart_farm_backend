import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FarmAiService } from './farm-ai.service';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface RequestUser {
  userId: number;
  email: string;
}

@Controller('farm-ai')
@UseGuards(JwtAuthGuard)
export class FarmAiController {
  constructor(private readonly farmAiService: FarmAiService) {}

  @Post('chat')
  async chat(@CurrentUser() user: RequestUser, @Body() dto: ChatDto) {
    const userId = user.userId;
    const result = await this.farmAiService.chat(userId, dto);

    return {
      success: true,
      data: result,
    };
  }

  @Get('history')
  async getChatHistory(
    @CurrentUser() user: RequestUser,
    @Query('barn_id', ParseIntPipe) barnId: number,
    @Query('limit') limit?: string,
  ) {
    const userId = user.userId;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const history = await this.farmAiService.getChatHistory(
      userId,
      barnId,
      limitNum,
    );

    return {
      success: true,
      data: history,
    };
  }
}
