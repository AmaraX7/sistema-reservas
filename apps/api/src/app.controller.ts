import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SkipThrottle } from '@nestjs/throttler';

// define el controlador principal de la app, con una ruta raiz y un metodo get que devuelve un string, delegando la logica al servicio
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health') // ruta para despertar la API de vez en cuando con uptimerobot
  @SkipThrottle() // salta el rate limiting para esta ruta
  health() {
    return { status: 'ok' };
  }
}
