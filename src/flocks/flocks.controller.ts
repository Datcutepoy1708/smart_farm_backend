import { Controller } from '@nestjs/common';
import { FlocksService } from './flocks.service';

@Controller('flocks')
export class FlocksController {
  constructor(private readonly flocksService: FlocksService) {}
}
