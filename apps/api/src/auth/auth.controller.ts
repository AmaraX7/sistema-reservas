import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Crear una nueva cuenta' })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ access_token: string; refresh_token: string }> {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login y obtener token JWT' })
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ access_token: string; refresh_token: string }> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refrescar token JWT' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshTokens(dto.refresh_token);
  }
}
// 1. Cliente hace POST /auth/login
//    recibe { access_token, refresh_token }
//    guarda los dos tokens (localStorage, memoria, etc.)

// 2. Cliente hace requests normales con el access_token

// 3. access_token expira (en 15 min) y cliente recibe un 401

// 4. Cliente detecta el 401
//    automáticamente hace POST /auth/refresh con { refresh_token }
//    recibe nuevo { access_token, refresh_token }
//    guarda los tokens nuevos
//    reintenta la request original que había fallado

// 5. El usuario nunca se entera de nada
