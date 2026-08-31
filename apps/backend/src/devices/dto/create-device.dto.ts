import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const IPV4_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export class CreateDeviceDto {
  @IsIn(['SWITCH', 'ACCESS_POINT'])
  kind!: 'SWITCH' | 'ACCESS_POINT';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @Matches(IPV4_REGEX, { message: 'ipAddress must be a valid IPv4 address' })
  ipAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  brand!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mapLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mapLng?: number;
}
