import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourcesService } from './resources.service';
import { Resource } from './entities/resource.entity';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationDto } from '../common/dto/pagination.dto';
import type { RequestWithUser } from '../auth/request-with-user.interface';

@ApiTags('resources')
// El controlador recibe peticiones y delega la logica al servicio.
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar recursos' })
  async findAll(
    @Query() pagination: PaginationDto,
    // como el ocmpanyid es opcional, pues si no está el parseint no intenta convertirlo y lo pasa undefined
    // asi el admin podra listar recursos de todas las empresas
    @Query('companyId', new ParseIntPipe({ optional: true })) companyId?: number,

  ) {
    return this.resourcesService.findAll(pagination, companyId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company_admin', 'super_admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear un nuevo recurso' })
  create(
    @Body() dto: CreateResourceDto,
    @Request() req: RequestWithUser,
  ): Promise<Resource> {
    return this.resourcesService.create(dto, req.user.role, req.user.companyId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company_admin', 'super_admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un recurso' })
  deleteOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    return this.resourcesService.deleteOne(
      id,
      req.user.role,
      req.user.companyId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar recurso por ID' })
  getOne(@Param('id', ParseIntPipe) id: number): Promise<Resource> {
    return this.resourcesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company_admin', 'super_admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un recurso' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResourceDto,
    @Request() req: RequestWithUser,
  ): Promise<Resource> {
    return this.resourcesService.update(
      id,
      dto,
      req.user.role,
      req.user.companyId,
    );
  }
}
