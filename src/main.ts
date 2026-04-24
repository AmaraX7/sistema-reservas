import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // useGlobalPipes aplica la validación a TODOS los endpoints automáticamente
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta campos que no están en el DTO
      forbidNonWhitelisted: true, // si viene un campo extra, devuelve 400
      transform: true, // convierte tipos: ej. "1" (string) → 1 (number)
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter()); // atrapa excepciones HTTP y devuelve un formato JSON consistente para frontend

  const config = new DocumentBuilder()
    .setTitle('Sistema de reservas de la universidad')
    .setDescription(
      'API REST para gestionar reservas de recursos universitarios',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config); // genera la documentación Swagger a partir de los decoradores @Api
  SwaggerModule.setup('api', app, document); // la documentación Swagger estará en /api

  // escucha en el puerto definido en .env o 3000 por defecto
  await app.listen(process.env.PORT ?? 3001);
}
// bootstrap es la función principal que arranca la aplicación NestJS, creando una instancia de la app
bootstrap();
