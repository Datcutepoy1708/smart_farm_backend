import { PartialType } from '@nestjs/mapped-types';
import { CreateBarnDto } from './create-barn.dto';

export class UpdateBarnDto extends PartialType(CreateBarnDto) {}
