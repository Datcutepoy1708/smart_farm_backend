import { Controller } from '@nestjs/common';
import { FarmAiService } from './farm-ai.service';

@Controller('farm-ai')
export class FarmAiController {
  constructor(private readonly farmAiService: FarmAiService) {}
}
