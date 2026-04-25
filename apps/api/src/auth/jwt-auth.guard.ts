import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable() //
export class JwtAuthGuard extends AuthGuard('jwt') {
  // esta clase sirve para proteger las rutas, es decir
  // para que solo los usuarios autenticados puedan acceder a ellas, se utiliza el decorador @UseGuards(JwtAuthGuard)
}
