// resource.entity.ts
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn()
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

  @ManyToOne(() => Company, company => company.resources, { nullable: false, eager: false })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column()
  companyId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  capacity?: number;
}
