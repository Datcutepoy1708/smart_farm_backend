import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { RegisterTokenDto } from './dto/register-token.dto';

interface JwtRequest {
  user: { userId: number };
}

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** POST /api/notifications/register-token */
  @Post('register-token')
  async registerToken(
    @Body() dto: RegisterTokenDto,
    @Request() req: JwtRequest,
  ) {
    const data = await this.notificationsService.registerToken(req.user.userId, dto);
    return { success: true, data };
  }

  /** DELETE /api/notifications/token/:token */
  @Delete('token/:token')
  async removeToken(@Param('token') token: string) {
    await this.notificationsService.removeToken(token);
    return { success: true };
  }
}
