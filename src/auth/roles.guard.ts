import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // lee los roles requeridos de la metadata del endpoint (@Roles('admin'))
    // peero si no hay roles definidos, deja pasar a cualquiera
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    // Extrae el usuario del request — lo puso JwtStrategy en req.userId
    const { user } = context.switchToHttp().getRequest();

    // Comprueba si el rol del usuario está entre los roles requeridos
    return requiredRoles.includes(user.role);
  }
}