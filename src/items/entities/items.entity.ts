import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn() // id autoincremental como serial en SQL
  id!: number;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  category!: string;

  @Column()
  totalStock!: number;

  @Column()
  availableStock!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price!: number;
}