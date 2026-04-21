import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import {  ItemsService } from './items.service';
import { Item } from './entities/items.entity';

// el controlador se encarga de recibir las peticiones, y delegar la logica al servicio, el servicio es el modelo@Controller('items')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {} 

    @Get()
  getAll(): Promise<Item[]> {
    return this.itemsService.findAll();
  }
  
    @Post()
  create(@Body() dto: CreateItemDto): Promise<Item> {
  return this.itemsService.create(dto);
  }

  @Delete(':id')
  deleteOne(@Param('id') id: number): Promise<void> {
    return this.itemsService.deleteOne(id);
  }

    @Delete()
  deleteAll(): Promise<void> {
    return this.itemsService.deleteAll();
  } 

    @Get(':id')
  getOne(@Param('id') id: number): Promise<Item> {
    return this.itemsService.findOne(id);
  }

    @Patch(':id')
    update(@Param('id') id: number, @Body() updateItemDto: UpdateItemDto): Promise<Item> {
    return this.itemsService.update(id, updateItemDto);
    }
}