// user.entity.ts
import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

export enum UserRole {
  USER = 'user',
  COMPANY_ADMIN = 'company_admin',
  SUPER_ADMIN = 'super_admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @ManyToOne(() => Company, company => company.users, { nullable: true, eager: false }) // null porque el usuario puede ser el normal
  @JoinColumn({ name: 'companyId' }) // para decirle que la columna que hace de FK se llama companyId
  company!: Company | null;

  @Column({ nullable: true })
  companyId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;
}