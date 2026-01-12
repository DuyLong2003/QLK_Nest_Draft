import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeviceImportRepository } from '../repositories/device-import.repository';
import { CreateDeviceImportDto } from '../dto/create-device-import.dto';
import { UpdateDeviceImportDto } from '../dto/update-device-import.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { DeviceImport } from '../schemas/device-import.schemas';
import { DeviceService } from '../../devices/services/device.service';

@Injectable()
export class DeviceImportService {
  constructor(
    private readonly deviceImportRepository: DeviceImportRepository,
    private readonly deviceService: DeviceService,
  ) { }

  async create(createDto: CreateDeviceImportDto, userId: string): Promise<DeviceImport> {
    // 1. Tự sinh mã phiếu nếu FE không gửi
    let code = createDto.code;
    if (!code) {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      code = `NK-${year}-${month}-${random}`;
    }

    // 2. Tính toán tổng
    const products = createDto.products || [];
    const { totalItem, totalQuantity } = this.calculateTotals(products);

    const details = createDto.details || [];
    const status = createDto.status || 'DRAFT';

    // 3. Map dữ liệu
    const payload = {
      ...createDto,
      code,
      products,
      details,
      totalItem,
      totalQuantity,
      status,
      createdBy: userId ? userId : null
    };

    const newImport = await this.deviceImportRepository.create(payload as any);

    return newImport;
  }

  async findAll(filter: any = {}): Promise<DeviceImport[]> {
    return this.deviceImportRepository.findAll(filter);
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<DeviceImport>> {
    return this.deviceImportRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<DeviceImport> {
    const deviceimport = await this.deviceImportRepository.findById(id);
    if (!deviceimport) {
      throw new NotFoundException('Không tìm thấy phiếu nhập thiết bị');
    }
    return deviceimport;
  }

  async update(id: string, updateDto: UpdateDeviceImportDto, userId: string): Promise<DeviceImport> {
    const existing = await this.findById(id);

    // Chỉ cho sửa khi đang DRAFT
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ được sửa các phiếu ở trạng thái DRAFT (nháp)');
    }

    let updateData: any = {
      ...updateDto,
      updatedBy: userId
    };

    // Tính lại tổng nếu sửa products
    if (updateDto.products) {
      const { totalItem, totalQuantity } = this.calculateTotals(updateDto.products);
      updateData.totalItem = totalItem;
      updateData.totalQuantity = totalQuantity;
    }

    const updated = await this.deviceImportRepository.update(id, updateData);

    return updated;
  }

  async delete(id: string): Promise<DeviceImport> {
    const existing = await this.findById(id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ được xóa các phiếu ở trạng thái DRAFT (nháp)');
    }

    const deleted = await this.deviceImportRepository.delete(id);
    if (!deleted) {
      throw new BadRequestException('Xóa phiếu không thành công');
    }
    return deleted;
  }

  private calculateTotals(products: any[]) {
    if (!products || !Array.isArray(products) || products.length === 0) {
      return { totalItem: 0, totalQuantity: 0 };
    }
    const totalItem = products.length;
    const totalQuantity = products.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return { totalItem, totalQuantity };
  }

  async updateProgress(id: string, data: { serialImported: number }) {
    const ticket = await this.findById(id);
    let newStatus = ticket.inventoryStatus;

    // Logic tự động cập nhật trạng thái kiểm kê
    if (data.serialImported > 0 && data.serialImported < ticket.totalQuantity) {
      newStatus = 'in-progress';
    } else if (data.serialImported >= ticket.totalQuantity) {
      newStatus = 'completed';
    }

    return this.deviceImportRepository.update(id, {
      serialImported: data.serialImported,
      inventoryStatus: newStatus
    });
  }
}