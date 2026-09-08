import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InfluxService } from '../influx/influx.service';
import { DevicesService } from './devices.service';
import { UpdateDeviceDto } from './dto/update-device.dto';

@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly influxService: InfluxService,
  ) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Get(':id/traffic-history')
  trafficHistory(
    @Param('id') id: string,
    @Query('minutes', new ParseIntPipe({ optional: true })) minutes?: number,
  ) {
    return this.influxService.queryDeviceTraffic(id, minutes ?? 60);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.devicesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.devicesService.remove(id);
  }
}
