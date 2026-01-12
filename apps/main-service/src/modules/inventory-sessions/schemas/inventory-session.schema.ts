import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import paginate, { PaginateModel } from '../../../plugins/paginate.plugin';
import { toJSONPlugin } from '../../../plugins/toJSON.plugin';
import { User } from '../../../users/entities/user.entity';
import { DeviceImport } from '../../device-imports/schemas/device-import.schemas';

@Schema({ timestamps: true })
export class InventorySession extends Document {
    @Prop({ required: true, unique: true })
    code: string; // Mã phiên (VD: PKK-2026-001)

    @Prop({ required: true })
    name: string; // Tên phiên (VD: Kiểm kê lần 1)

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'DeviceImport', required: true })
    importId: DeviceImport;

    @Prop({ default: 'processing', enum: ['processing', 'completed', 'cancelled'] })
    status: string;

    @Prop()
    note: string;

    // Danh sách serial đã quét trong phiên này
    @Prop({
        type: [{
            serial: String,
            model: String,
            scannedAt: { type: Date, default: Date.now }
        }],
        default: []
    })
    details: Array<{
        serial: string;
        model: string;
        scannedAt: Date;
    }>;

    @Prop({ default: 0 })
    totalScanned: number;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    createdBy: User;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    updatedBy: User;
}

export const InventorySessionSchema = SchemaFactory.createForClass(InventorySession);
InventorySessionSchema.plugin(paginate);
InventorySessionSchema.plugin(toJSONPlugin);

export type InventorySessionModel = PaginateModel<InventorySession>;