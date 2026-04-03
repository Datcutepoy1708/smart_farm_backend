import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

const YOLO_API_KEY = 'smart_farm_yolo_key_2026';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || apiKey !== YOLO_API_KEY) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
