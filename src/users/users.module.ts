import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/users.entity';

import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // registra las entidades Item y User para que orm pueda usarlas en el servicio
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // exportamos el servicio para que pueda ser usado en otros módulos (AuthModule)
})
export class UsersModule {}
