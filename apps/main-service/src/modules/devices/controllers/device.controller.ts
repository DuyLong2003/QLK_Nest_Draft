import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Put,
  Delete,
  Param,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { DeviceService } from '../services/device.service';
import { CreateDeviceDto } from '../dto/create-device.dto';
import { UpdateDeviceDto } from '../dto/update-device.dto';
import { DevicePaginationDto } from '../dto/device-pagination.dto';
import { createFilterAndOptions } from '../../../utils/pick.util';

@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDeviceDto: CreateDeviceDto) {
    return this.deviceService.create(createDeviceDto);
  }

  @Get()
  async findAll(@Query() query: DevicePaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['categoryId', 'warehouseId', 'importId', 'currentExportId'], // Filter keys for exact match
      ['serial', 'mac', 'p2p', 'name', 'model', 'unit'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    // Nếu có tham số phân trang, sử dụng phân trang
    if (query.page || query.limit) {
      return this.deviceService.findAllWithPagination(filter, options);
    }
    // Nếu không, trả về tất cả với filter
    return this.deviceService.findAll(filter);
  }

  @Get('paginated')
  async findAllPaginated(@Query() query: DevicePaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['categoryId', 'warehouseId', 'importId', 'currentExportId'], // Filter keys for exact match
      ['serial', 'mac', 'p2p', 'name', 'model', 'unit'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    return this.deviceService.findAllWithPagination(filter, options);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.deviceService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDeviceDto: UpdateDeviceDto) {
    return this.deviceService.update(id, updateDeviceDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.deviceService.delete(id);
  }
}
