import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DevicesService } from './devices.service';

@UseGuards(JwtAuthGuard)
@Controller('zones/:zoneId/devices')
export class ZoneDevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  findAll(
    @Param('zoneId') zoneId: string,
    @Query('kind') kind?: 'SWITCH' | 'ACCESS_POINT',
  ) {
    return this.devicesService.findAllByZone(zoneId, kind);
  }

  @Post()
  create(@Param('zoneId') zoneId: string, @Body() dto: CreateDeviceDto) {
    return this.devicesService.create(zoneId, dto);
  }
}
