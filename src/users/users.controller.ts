import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update.user.dto';


@ApiTags('users')
@Controller('users')

export class UsersController {
  constructor(private readonly usersService: UsersService) {}


    @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'company_admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar usuarios (super_admin: todos, company_admin: los de su empresa)' })
  async findAll(@Request() req) {
    return this.usersService.findAll(req.user.role, req.user.companyId);
  }

    @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener perfil propio' })
  getMe(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar perfil propio' })
  updateMe(@Request() req, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(req.user.userId, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar cuenta propia' })
  deleteMe(@Request() req): Promise<void> {
    return this.usersService.deleteById(req.user.userId, req.user.userId, req.user.role, req.user.companyId);
  }

  @Get('by-email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Buscar usuario por email' })
  async findByEmail(@Query('email') email: string) {
    return this.usersService.findByEmail(email);
  }


  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'company_admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar usuario' })
  async deleteUser(@Param('id') id: number, @Request() req): Promise<void> {
    return this.usersService.deleteById(id, req.user.userId, req.user.role, req.user.companyId);
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'company_admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar rol de usuario' })
  async updateRole(@Param('id') id: number, @Body() dto: UpdateRoleDto, @Request() req) {
    return this.usersService.updateRole(id, dto, req.user.role, req.user.companyId);
  }
}