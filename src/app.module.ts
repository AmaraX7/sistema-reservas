import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResourcesModule } from './resources/resources.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ReservationsModule } from './reservations/reservations.module';


@Module({
  imports: [
    // cargo las variables de entorno globalmente
    ConfigModule.forRoot({
      isGlobal: true, // for root disponible en TODA la app sin reimportar
    }),

    // Conecta TypeORM con PostgreSQL usando las variables de entorno
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        autoLoadEntities: true, // carga automÃ¡ticamente las entidades que definas
        synchronize: false ,      // crea/actualiza tablas automÃ¡ticamente â€” solo en desarrollo
      }),
      inject: [ConfigService],
    }),

    ResourcesModule,

    UsersModule,

    AuthModule,

    ReservationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

