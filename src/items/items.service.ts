import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from './entities/items.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

// OPERACIONES TYPEORM a SQL 

// // SELECT * FROM items
// this.itemsRepository.find();

// // SELECT * FROM items WHERE category = 'Electronics'
// this.itemsRepository.find({ where: { category: 'Electronics' } });

// // SELECT * FROM items WHERE id = 1 LIMIT 1
// this.itemsRepository.findOne({ where: { id: 1 } });

// // INSERT INTO items (name, price) VALUES ('Laptop', 999)
// const item = this.itemsRepository.create(dto);
// this.itemsRepository.save(item);

// // UPDATE items SET price = 500 WHERE id = 1
// const item = await this.itemsRepository.findOne({ where: { id: 1 } });
// Object.assign(item, { price: 500 });
// this.itemsRepository.save(item);

// // DELETE FROM items WHERE id = 1
// this.itemsRepository.delete(1);

// // SELECT COUNT(*) FROM items
// this.itemsRepository.count();

// // SELECT * FROM items WHERE price > 100 ORDER BY price ASC LIMIT 10
// this.itemsRepository.find({
//   where: { price: MoreThan(100) },  // necesita import de typeorm
//   order: { price: 'ASC' },
//   take: 10,                         // LIMIT
// });

// // SELECT * FROM items WHERE price > 100 ORDER BY price ASC LIMIT 10 OFFSET 20
// this.itemsRepository.find({
//   where: { price: MoreThan(100) },
//   order: { price: 'ASC' },
//   take: 10,   // LIMIT
//   skip: 20,   // OFFSET — para paginación
// });

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>, // TypeORM nos da este repositorio
  ) {}

  async findAll(): Promise<Item[]> {
  return this.itemsRepository.find();
  }

  async findOne(id: number): Promise<Item> {
    const item = await this.itemsRepository.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Item #${id} not found`);
    return item;
  }

  async deleteOne(id: number): Promise<void> {
    await this.findOne(id); // lanza NotFoundException si no existe
    await this.itemsRepository.delete(id);
  }

  async deleteAll(): Promise<void> {
    await this.itemsRepository.clear();
  }

  async create(dto: CreateItemDto): Promise<Item> {
  const item = this.itemsRepository.create(dto);
  return this.itemsRepository.save(item);
  }

  async update(id: number, dto: UpdateItemDto): Promise<Item> {
    const item = await this.findOne(id);            // busca o lanza 404
    Object.assign(item, dto);                       // merge igual que el spread operator
    return this.itemsRepository.save(item);         // UPDATE items SET ...
  }
}