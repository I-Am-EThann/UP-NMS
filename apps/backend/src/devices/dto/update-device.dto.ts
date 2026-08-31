import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateDeviceDto } from './create-device.dto';

export class UpdateDeviceDto extends PartialType(
  OmitType(CreateDeviceDto, ['kind'] as const),
) {}
