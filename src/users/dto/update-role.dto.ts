import { IsEnum } from 'class-validator';
import { UserRole } from '../entities/users.entity';

export class UpdateRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}
