import { Injectable, Logger } from '@nestjs/common';
import { User } from './entities/users.entity';
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
  private readonly usersRepository: Repository<User>
) {}

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
  const user = this.usersRepository.create({ ...dto, password: hashedPassword });
  const savedUser = await this.usersRepository.save(user);
  const { password, ...result } = savedUser;
  return result;
}

async deleteById(id: number): Promise<void> {
  const user = await this.usersRepository.findOne({ where: { id } });
  if (!user) throw new NotFoundException(`User #${id} not found`);
  await this.usersRepository.delete(id);
  this.logger.log(`Deleted user id=${id}`);
} 

  async updateRole(id: number, dto: UpdateRoleDto) {
  const user = await this.usersRepository.findOne({ where: { id } });
  if (!user) throw new NotFoundException(`User #${id} not found`);
  
  Object.assign(user, dto);
  const updatedUser = await this.usersRepository.save(user); 
  this.logger.log(`Updated user role id=${id}, role=${updatedUser.role}`);
  const { password, ...result } = updatedUser;
  return result;
}


  
}
