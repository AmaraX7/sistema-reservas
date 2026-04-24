// company.entity.ts
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Resource } from '../../resources/entities/resource.entity';
import { User } from '../../users/entities/users.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => Resource, resource => resource.company)
  resources!: Resource[];

  @OneToMany(() => User, user => user.company)
  users!: User[];

  @CreateDateColumn()
  createdAt!: Date;
}