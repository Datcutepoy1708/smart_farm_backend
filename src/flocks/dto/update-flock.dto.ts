import { PartialType } from '@nestjs/mapped-types';
import { CreateFlockDto } from './create-flock.dto';

export class UpdateFlockDto extends PartialType(CreateFlockDto) {}
