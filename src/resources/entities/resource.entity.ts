import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CreateDateColumn } from 'typeorm/decorator/columns/CreateDateColumn';


export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('resources')
export class Resource {

  @PrimaryGeneratedColumn() // id autoincremental como serial en SQL
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;


  @Column()
  status!: ResourceStatus;

  @Column()
  location!: string;

  @Column()
  type!: string;

  @CreateDateColumn() // fecha de creación automática
  createdAt!: Date;
}
