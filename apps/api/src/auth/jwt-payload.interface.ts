import { UserRole } from '../users/entities/users.entity';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  companyId: number | null;
}
