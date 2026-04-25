import { ForbiddenException, Logger } from '@nestjs/common';
import { User, UserRole } from './entities/users.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserDto } from './dto/update.user.dto';

// repositorio tiene find() findOne() save() delete()
// y es lo que accede a la BD, y lo inyecto con @InjectRepository(Entity) en el constructor del servicio para usarlo en los métodos

export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAll(role: UserRole, companyId: number | null) {
    if (role === UserRole.SUPER_ADMIN) {
      const users = await this.usersRepository.find();
      return users.map(({ password: _password, ...u }) => u);
    }
    if (role === UserRole.COMPANY_ADMIN) {
      if (!companyId) throw new ForbiddenException('No company associated');
      const users = await this.usersRepository.find({ where: { companyId } });
      return users.map(({ password: _password, ...u }) => u);
    }
    throw new ForbiddenException();
  }

  async findByEmail(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) return null;
    const { password, ...result } = user;
    return result;
  }
  async findById(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    const { password, ...result } = user;
    return result;
  }

  async updateMe(id: number, dto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    Object.assign(user, dto);
    const updated = await this.usersRepository.save(user);
    this.logger.log(`Updated user id=${id}`);
    const { password, ...result } = updated;
    return result;
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async createUser(dto: CreateUserDto) {
    this.logger.log(`Creating user email=${dto.email}`);
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      ...dto,
      password: hashedPassword,
    });
    const savedUser = await this.usersRepository.save(user);
    const { password, ...result } = savedUser;
    return result;
  }
  // pensar que hacer si quier crear un usuario qe esta soft deleted
  async deleteById(
    id: number,
    requesterId: number,
    requesterRole: UserRole,
    requesterCompanyId: number | null,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);

    if (
      requesterRole === UserRole.COMPANY_ADMIN &&
      user.companyId !== requesterCompanyId
    ) {
      throw new ForbiddenException('Cannot delete users from another company');
    }
    await this.usersRepository.softDelete(id);
    // si uso raw delete, borra directamente, con softDelete pone la fecha en deletedAt y no lo borra realmente, así no se me ponen corruptos las entidades q tienen fk a user, como las reservas,
    // y puedo mantener el historial de quién hizo qué reserva aunque el usuario se haya borrado
    this.logger.log(`Deleted user id=${id}`);
  }

  async updateRole(
    id: number,
    dto: UpdateRoleDto,
    requesterRole: UserRole,
    requesterCompanyId: number | null,
  ) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);

    if (requesterRole === UserRole.COMPANY_ADMIN) {
      if (user.companyId !== requesterCompanyId)
        throw new ForbiddenException(
          'Cannot update users from another company',
        );
      if (dto.role === UserRole.SUPER_ADMIN)
        throw new ForbiddenException('Cannot assign super_admin role');
    }

    Object.assign(user, dto);
    const updated = await this.usersRepository.save(user);
    this.logger.log(`Updated user role id=${id}, role=${updated.role}`);
    const { password, ...result } = updated;
    return result;
  }
}
