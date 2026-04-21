import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ItemsModule } from './items/items.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';


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
        autoLoadEntities: true, // carga automáticamente las entidades que definas
        synchronize: true,      // crea/actualiza tablas automáticamente — solo en desarrollo
      }),
      inject: [ConfigService],
    }),

    ItemsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
