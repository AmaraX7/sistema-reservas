import { Request } from 'express';
import { UserRole } from '../users/entities/users.entity';

export interface RequestWithUser extends Request {
  user: {
    userId: number;
    email: string;
    role: UserRole;
    companyId: number | null;
  };
}
