import { IsString, IsOptional, IsArray, ValidateNested, IsEnum, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class ScannedDetailDto {
    @IsString()
    @IsNotEmpty()
    serial: string;

    @IsString()
    @IsNotEmpty()
    model: string;
}

export class UpdateInventorySessionDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsEnum(['processing', 'completed', 'cancelled'])
    status?: string;

    // Dùng để push thêm serial vào phiên
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ScannedDetailDto)
    scannedItems?: ScannedDetailDto[];
}