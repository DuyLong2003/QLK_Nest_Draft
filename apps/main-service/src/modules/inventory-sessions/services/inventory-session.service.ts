import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InventorySessionRepository } from '../repositories/inventory-session.repository';
import { CreateInventorySessionDto } from '../dto/create-inventory-session.dto';
import { UpdateInventorySessionDto } from '../dto/update-inventory-session.dto';
import { InventorySession } from '../schemas/inventory-session.schema';
import { DeviceImportService } from '../../device-imports/services/device-import.service';
import { DeviceService } from '../../devices/services/device.service';
import { WarehouseRepository } from '../../warehouses/repositories/warehouse.repository';
import { CategoryRepository } from '../../categories/repositories/categories.repository';

@Injectable()
export class InventorySessionService {
    private readonly logger = new Logger(InventorySessionService.name);

    constructor(
        private readonly sessionRepo: InventorySessionRepository,
        private readonly deviceImportService: DeviceImportService,
        private readonly deviceService: DeviceService,
        private readonly warehouseRepo: WarehouseRepository,
        private readonly categoryRepo: CategoryRepository,
    ) { }

    async create(createDto: CreateInventorySessionDto, userId: string): Promise<InventorySession> {
        const importTicket = await this.deviceImportService.findById(createDto.importId);
        if (!importTicket) throw new NotFoundException('Phiếu nhập không tồn tại');
        if (importTicket.status === 'COMPLETED') throw new BadRequestException('Phiếu nhập đã hoàn thành');

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = `PKK-${dateStr}-${random}`;

        return this.sessionRepo.create({
            ...createDto,
            code,
            status: 'processing',
            details: [],
            totalScanned: 0,
            createdBy: userId,
        });
    }

    async update(id: string, updateDto: UpdateInventorySessionDto, userId: string): Promise<InventorySession> {
        const session = await this.sessionRepo.findById(id);
        if (!session) throw new NotFoundException('Không tìm thấy phiên kiểm kê');
        if (session.status === 'completed') throw new BadRequestException('Phiên đã hoàn thành');

        const updateData: any = { ...updateDto, updatedBy: userId };

        if (updateDto?.scannedItems?.length > 0) {
            const newDetails = [
                ...session.details,
                ...updateDto.scannedItems.map(item => ({
                    ...item,
                    scannedAt: new Date()
                }))
            ];
            updateData.details = newDetails;
            updateData.totalScanned = newDetails.length;
            delete updateData.scannedItems;
        }

        const updatedSession = await this.sessionRepo.update(id, updateData);

        // Nếu status là completed -> Kích hoạt nhập kho
        if (updateDto.status === 'completed') {
            await this.processSessionCompletion(updatedSession);
        }

        return updatedSession;
    }

    async findAll(filter: any = {}): Promise<InventorySession[]> {
        return this.sessionRepo.findAll(filter);
    }

    async findById(id: string): Promise<InventorySession> {
        const session = await this.sessionRepo.findById(id);
        if (!session) throw new NotFoundException('Not Found');
        return session;
    }

    private async processSessionCompletion(session: InventorySession) {
        try {
            const importIdStr = session.importId.toString();
            const importTicket = await this.deviceImportService.findById(importIdStr);

            // 1. Cập nhật tiến độ vào Phiếu Nhập
            const currentImported = importTicket.serialImported || 0;
            const sessionCount = session.totalScanned;

            await this.deviceImportService.updateProgress(importIdStr, {
                serialImported: currentImported + sessionCount
            });

            // 2. Tìm Config để tạo Device
            const warehouse = await this.warehouseRepo.findOne({ code: 'PENDING_QC' });
            const category = await this.categoryRepo.findOne({ name: importTicket.productType });

            if (!warehouse) {
                this.logger.error(`Không tìm thấy kho có code='PENDING_QC'. Hãy kiểm tra lại Seed Data.`);
            }
            if (!category) {
                this.logger.error(`Không tìm thấy danh mục có name='${importTicket.productType}'. Hãy kiểm tra lại Seed Data hoặc ProductType gửi lên.`);
            }

            if (!warehouse || !category) {
                this.logger.warn('Bỏ qua bước tạo Device do thiếu cấu hình Kho/Danh mục.');
                return;
            }

            // 3. Tạo Devices
            let successCount = 0;
            for (const item of session.details) {
                try {
                    await this.deviceService.create({
                        code: item.serial,
                        name: item.model,
                        deviceModel: item.model,
                        serial: item.serial,
                        status: 'PENDING_QC',
                        warehouseId: warehouse._id,
                        categoryId: category._id,
                        unit: 'Cái',
                        importId: importTicket._id,
                        supplierId: importTicket.supplier,
                        importDate: importTicket.importDate,
                        p2p: '',
                        mac: '',
                        price: 0
                    } as any);
                    successCount++;
                } catch (e) {
                    this.logger.error(`Lỗi tạo device ${item.serial}: ${e.message}`);
                }
            }
            this.logger.log(`Đã nhập kho thành công ${successCount}/${session.details.length} thiết bị từ phiên ${session.code}`);

        } catch (error) {
            this.logger.error('Lỗi trong quá trình xử lý hoàn thành phiên:', error);
        }
    }
}