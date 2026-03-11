import { Controller } from '@nestjs/common';
import { BarnsService } from './barns.service';

@Controller('barns')
export class BarnsController {
  constructor(private readonly barnsService: BarnsService) {}
}
