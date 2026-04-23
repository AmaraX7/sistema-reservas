import { Controller, Get, Query } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { Body, Post, Request, UseGuards, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) {}

@Post()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiOperation({ summary: 'Crear una nueva reserva' })
create(@Body() dto: CreateReservationDto, @Request() req) {
  return this.reservationsService.create(req.user.userId, dto);
}

@Get('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiOperation({ summary: 'Buscar reservas por usuario' })
async findByUser(@Request() req) {
  return this.reservationsService.findByUser(req.user.userId);
}

// PATCH /reservations/:id/status — actualizar estado (admin y usuario)
// GET /reservations — todas las reservas (admin)

@Patch(':id/status')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiOperation({ summary: 'Actualizar estado de la reserva' })
updateStatus(@Param('id') id: number, @Body() dto: UpdateReservationDto, @Request() req) {
  return this.reservationsService.updateStatus(id, dto, req.user.userId, req.user.role);
}

@Get()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('JWT-auth')
@ApiOperation({ summary: 'Buscar todas las reservas' })
async findAll(@Query() pagination: PaginationDto) {
  return this.reservationsService.findAll(pagination);
}

@Get(':id')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiOperation({ summary: 'Buscar reserva por ID' })
findById(@Param('id') id: string) {
  return this.reservationsService.findById(Number(id));
}

}
