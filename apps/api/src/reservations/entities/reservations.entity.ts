import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/users.entity';
import { Resource } from '../../resources/entities/resource.entity';

export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { eager: false }) // Relación con User, el usuario no se carga automáticamente con eager: false
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @ManyToOne(() => Resource, { eager: false })
  @JoinColumn({ name: 'resourceId' })
  resource!: Resource;

  @Column()
  resourceId!: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.CONFIRMED,
  })
  status!: ReservationStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @Column()
  startTime!: Date;

  @Column()
  endTime!: Date;
}
