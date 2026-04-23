import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

// OPERACIONES TYPEORM a SQL 

// // SELECT * FROM products
// this.productsRepository.find();

// // SELECT * FROM products WHERE category = 'Electronics'
// this.productsRepository.find({ where: { category: 'Electronics' } });

// // SELECT * FROM products WHERE id = 1 LIMIT 1
// this.productsRepository.findOne({ where: { id: 1 } });

// // INSERT INTO products (name, price) VALUES ('Laptop', 999)
// const resource = this.productsRepository.create(dto);
// this.productsRepository.save(resource);

// // UPDATE products SET price = 500 WHERE id = 1
// const resource = await this.productsRepository.findOne({ where: { id: 1 } });
// Object.assign(resource, { price: 500 });
// this.productsRepository.save(resource);

// // DELETE FROM products WHERE id = 1
// this.productsRepository.delete(1);

// // SELECT COUNT(*) FROM products
// this.productsRepository.count();

// // SELECT * FROM products WHERE price > 100 ORDER BY price ASC LIMIT 10
// this.productsRepository.find({
//   where: { price: MoreThan(100) },  // necesita import de typeorm
//   order: { price: 'ASC' },
//   take: 10,                         // LIMIT
// });

// // SELECT * FROM products WHERE price > 100 ORDER BY price ASC LIMIT 10 OFFSET 20
// this.productsRepository.find({
//   where: { price: MoreThan(100) },
//   order: { price: 'ASC' },
//   take: 10,   // LIMIT
//   skip: 20,   // OFFSET â€” para paginaciÃ³n
// });

@Injectable()
export class ResourcesService {
  constructor(
  @InjectRepository(Resource)
  private readonly resourcesRepository: Repository<Resource>,
  ) {}

  async findAll(): Promise<Resource[]> {
  return this.resourcesRepository.find();
  }

  async findOne(id: number): Promise<Resource> {
    const resource = await this.resourcesRepository.findOne({ where: { id } });
    if (!resource) throw new NotFoundException(`Resource #${id} not found`);
    return resource;
  }

  async deleteOne(id: number): Promise<void> {
    await this.findOne(id); // lanza NotFoundException si no existe
    await this.resourcesRepository.delete(id);
  }

  async create(dto: CreateResourceDto): Promise<Resource> {
    const resource = this.resourcesRepository.create(dto);
    return this.resourcesRepository.save(resource);
  }
  
  async update(id: number, dto: UpdateResourceDto): Promise<Resource> {
    const resource = await this.findOne(id);
    Object.assign(resource, dto);
    return this.resourcesRepository.save(resource);
  }
}
