import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceController } from './controllers/device.controller';
import { DeviceService } from './services/device.service';
import { DeviceRepository } from './repositories/device.repository';
import { Device, DeviceSchema } from './schemas/device.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Device.name, schema: DeviceSchema }])
  ],
  controllers: [DeviceController],
  providers: [DeviceService, DeviceRepository],
  exports: [DeviceService, DeviceRepository]
})
export class DeviceModule { }
