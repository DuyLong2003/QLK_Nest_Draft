import { Controller, Post, Body, Get, Query, Put, Param, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { InventorySessionService } from '../services/inventory-session.service';
import { CreateInventorySessionDto } from '../dto/create-inventory-session.dto';
import { UpdateInventorySessionDto } from '../dto/update-inventory-session.dto';
import { InventorySessionPaginationDto } from '../dto/inventory-session-pagination.dto';

@Controller('inventory-sessions')
export class InventorySessionController {
    constructor(private readonly sessionService: InventorySessionService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createDto: CreateInventorySessionDto, @Request() req: any) {
        const userId = req.user?.id || req.headers['x-auth-user'] || 'system';
        return this.sessionService.create(createDto, userId);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateDto: UpdateInventorySessionDto, @Request() req: any) {
        const userId = req.user?.id || req.headers['x-auth-user'] || 'system';
        return this.sessionService.update(id, updateDto, userId);
    }

    @Get()
    async findAll(@Query() query: InventorySessionPaginationDto) {
        return this.sessionService.findAll({});
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.sessionService.findById(id);
    }
}