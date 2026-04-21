import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { Type } from 'class-transformer';
import { Item } from './entities/items.entity';
import { TypeOrmModule } from '@nestjs/typeorm';


// agrupa el controlador de lsoi tems con el sevicio (modelo) para que la app lo importo tood d1
@Module({
  imports: [TypeOrmModule.forFeature([Item])], // registra la entidad Item para que orm pueda usarla en el servicio
  controllers: [ItemsController],
  providers: [ItemsService]
})
export class ItemsModule {}
