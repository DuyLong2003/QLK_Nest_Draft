import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InventorySession, InventorySessionModel } from '../schemas/inventory-session.schema';
import { CreateInventorySessionDto } from '../dto/create-inventory-session.dto';
import { UpdateInventorySessionDto } from '../dto/update-inventory-session.dto';
import { PaginateResult } from '../../device-imports/interfaces/pagination-result.interface';

@Injectable()
export class InventorySessionRepository {
    constructor(
        @InjectModel(InventorySession.name)
        private readonly sessionModel: InventorySessionModel
    ) { }

    async create(createDto: any): Promise<InventorySession> {
        return this.sessionModel.create(createDto);
    }

    async findAll(filter: any = {}): Promise<InventorySession[]> {
        return this.sessionModel.find(filter).exec();
    }

    async findById(id: string): Promise<InventorySession | null> {
        return this.sessionModel.findById(id).exec();
    }

    async update(id: string, updateDto: any): Promise<InventorySession | null> {
        return this.sessionModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    }

    async delete(id: string): Promise<InventorySession | null> {
        return this.sessionModel.findByIdAndDelete(id).exec();
    }
}