import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserRole } from '../users/entities/users.entity';

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
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    @InjectRepository(Resource)
    private readonly resourcesRepository: Repository<Resource>,
  ) {}

  async findAll(
    pagination: PaginationDto,
    companyId?: number,
  ): Promise<{ data: Resource[]; total: number }> {
    this.logger.log('Listing all resources');
    const [resources, total] = await this.resourcesRepository.findAndCount({
      where: companyId ? { companyId } : {},
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
    });
    return { data: resources, total };
  }

  async findOne(id: number): Promise<Resource> {
    const resource = await this.resourcesRepository.findOne({ where: { id } });
    if (!resource) {
      this.logger.warn(`Resource not found: id=${id}`);
      throw new NotFoundException(`Resource #${id} not found`);
    }
    return resource;
  }

  async create(
    dto: CreateResourceDto,
    role: string,
    companyId: number | null,
  ): Promise<Resource> {
    if (role === UserRole.COMPANY_ADMIN) {
      if (!companyId) throw new ForbiddenException('No company associated');
      dto.companyId = companyId; // fuerza la empresa del admin, ignora lo que mande el body
    }
    this.logger.log(`Creating resource name=${dto.name}, type=${dto.type}`);
    const resource = this.resourcesRepository.create(dto);
    return this.resourcesRepository.save(resource);
  }

  async update(
    id: number,
    dto: UpdateResourceDto,
    role: string,
    companyId: number | null,
  ): Promise<Resource> {
    const resource = await this.findOne(id);
    if (role === UserRole.COMPANY_ADMIN && resource.companyId !== companyId) {
      throw new ForbiddenException(
        'Cannot update resources from another company',
      );
    }
    Object.assign(resource, dto);
    this.logger.log(`Updated resource id=${id}`);
    return this.resourcesRepository.save(resource);
  }

  async deleteOne(
    id: number,
    role: string,
    companyId: number | null,
  ): Promise<void> {
    const resource = await this.findOne(id);
    if (role === UserRole.COMPANY_ADMIN && resource.companyId !== companyId) {
      throw new ForbiddenException(
        'Cannot delete resources from another company',
      );
    }
    await this.resourcesRepository.delete(id);
    this.logger.log(`Deleted resource id=${id}`);
  }
}
