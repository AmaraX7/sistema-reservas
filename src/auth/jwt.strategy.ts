import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    
  constructor(private readonly configService: ConfigService) {
    // 2. JwtStrategy recibe el token y lo verifica con el secret
    // - jwtFromRequest: extrae el token del header Authorization: Bearer <token>
    // - ignoreExpiration: false → rechaza tokens expirados
    // - secretOrKey: el secret con el que se firmó el token en AuthService.login()
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // 3. Si el token es válido, Passport llama a validate() automáticamente
  // - payload es el objeto que metiste en jwtService.sign() al hacer login
  // - lo que devuelves aquí queda disponible como req.user en los controllers
  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email, role: payload.role,  companyId: payload.companyId ?? null};
  }
}

// FLUJO COMPLETO:
// 1. Cliente manda request con header: Authorization: Bearer <token>
// 2. JwtAuthGuard intercepta la request y llama a JwtStrategy
// 3. JwtStrategy verifica el token y llama a validate()
// 4. validate() devuelve { userId, email, role } → disponible como req.user
// 5. Si el token es inválido → 401 automático, nunca llega al controller