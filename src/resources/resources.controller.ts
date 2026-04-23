import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourcesService } from './resources.service';
import { Resource } from './entities/resource.entity';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('resources')
// El controlador recibe peticiones y delega la logica al servicio.
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

    @Get() 
  @ApiOperation({summary: 'Buscar todos los recursos'})
  getAll(): Promise<Resource[]> {
    return this.resourcesService.findAll();
  }
  
    @Post() 
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth('JWT-auth')
    @Roles('admin')
    @ApiOperation({ summary: 'Crear un nuevo recurso' })
  create(@Body() dto: CreateResourceDto): Promise<Resource> {
  return this.resourcesService.create(dto);
}

@Delete(':id') 
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@Roles('admin')
@ApiOperation({ summary: 'Eliminar un recurso' })
deleteOne(@Param('id') id: number): Promise<void> {
    return this.resourcesService.deleteOne(id);
  }


  @Get(':id')
  @ApiOperation({ summary: 'Buscar recurso por ID' })
  getOne(@Param('id') id: number): Promise<Resource> {
    return this.resourcesService.findOne(id);
  }

    @Patch(':id') 
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth('JWT-auth')
    @Roles('admin')
    @ApiOperation({ summary: 'Actualizar un recurso' })
    update(@Param('id') id: number, @Body() updateResourceDto: UpdateResourceDto): Promise<Resource> {
    return this.resourcesService.update(id, updateResourceDto);
    }
}
