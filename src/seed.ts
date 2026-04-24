import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

// ─── Entidades ────────────────────────────────────────────────────────────────

export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
}
export enum UserRole {
  USER = 'user',
  COMPANY_ADMIN = 'company_admin',
  SUPER_ADMIN = 'super_admin',
}
export enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('companies')
class Company {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ unique: true }) name!: string;
  @Column({ nullable: true }) description?: string;
  @CreateDateColumn() createdAt!: Date;
}

@Entity('users')
class User {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ unique: true }) email!: string;
  @Column() password!: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;
  @Column({ nullable: true }) companyId?: number;
  @CreateDateColumn() createdAt!: Date;
}

@Entity('resources')
class Resource {
  @PrimaryGeneratedColumn() id!: number;
  @Column() name!: string;
  @Column({ nullable: true }) description?: string;
  @Column() status!: ResourceStatus;
  @Column() location!: string;
  @Column() type!: string;
  @Column({ nullable: true }) capacity?: number;
  @Column() companyId!: number;
  @CreateDateColumn() createdAt!: Date;
}

@Entity('reservations')
class Reservation {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => User) @JoinColumn({ name: 'userId' }) user!: User;
  @Column() userId!: number;
  @ManyToOne(() => Resource)
  @JoinColumn({ name: 'resourceId' })
  resource!: Resource;
  @Column() resourceId!: number;
  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.CONFIRMED,
  })
  status!: ReservationStatus;
  @CreateDateColumn() createdAt!: Date;
  @Column() startTime!: Date;
  @Column() endTime!: Date;
}

// ─── Conexión ─────────────────────────────────────────────────────────────────

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5433),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'admin',
  database: process.env.DB_NAME ?? 'ecommerce',
  entities: [Company, User, Resource, Reservation],
  synchronize: false,
});

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  await AppDataSource.initialize();
  console.log('conectado a la base de datos');

  const companyRepo = AppDataSource.getRepository(Company);
  const userRepo = AppDataSource.getRepository(User);
  const resourceRepo = AppDataSource.getRepository(Resource);
  const reservationRepo = AppDataSource.getRepository(Reservation);

  // limpia en orden correcto
  await reservationRepo.query('DELETE FROM reservations');
  await resourceRepo.query('DELETE FROM resources');
  await userRepo.query('DELETE FROM users');
  await companyRepo.query('DELETE FROM companies');
  console.log('🗑️  Tablas limpiadas');

  // ── Empresas ──────────────────────────────────────────────────────────────
  const companies = await companyRepo.save([
    {
      name: 'WeWork Barcelona',
      description: 'Coworking en el centro de Barcelona',
    },
    {
      name: 'Spaces Diagonal',
      description: 'Coworking premium en Av. Diagonal',
    },
    { name: 'MOB Makers', description: 'Coworking creativo en Poblenou' },
  ]);
  console.log(`🏢 ${companies.length} empresas insertadas`);

  // ── Usuarios ──────────────────────────────────────────────────────────────
  const password = await bcrypt.hash('password123', 10);

  const users = await userRepo.save([
    // super admin
    { email: 'super@admin.com', password, role: UserRole.SUPER_ADMIN },
    // admins de cada empresa
    {
      email: 'admin@wework.com',
      password,
      role: UserRole.COMPANY_ADMIN,
      companyId: companies[0].id,
    },
    {
      email: 'admin@spaces.com',
      password,
      role: UserRole.COMPANY_ADMIN,
      companyId: companies[1].id,
    },
    {
      email: 'admin@mob.com',
      password,
      role: UserRole.COMPANY_ADMIN,
      companyId: companies[2].id,
    },
    // usuarios normales
    { email: 'alice@gmail.com', password, role: UserRole.USER },
    { email: 'bob@gmail.com', password, role: UserRole.USER },
    { email: 'carol@gmail.com', password, role: UserRole.USER },
    { email: 'dave@gmail.com', password, role: UserRole.USER },
    { email: 'eve@gmail.com', password, role: UserRole.USER },
  ]);
  console.log(`👤 ${users.length} usuarios insertados`);

  // ── Recursos ──────────────────────────────────────────────────────────────
  const resources = await resourceRepo.save([
    // WeWork Barcelona
    {
      name: 'Sala Picasso',
      description: 'Sala de reuniones para 8 personas',
      status: ResourceStatus.AVAILABLE,
      location: 'Planta 3',
      type: 'meeting_room',
      capacity: 8,
      companyId: companies[0].id,
    },
    {
      name: 'Sala Gaudí',
      description: 'Sala de reuniones para 12 personas',
      status: ResourceStatus.AVAILABLE,
      location: 'Planta 3',
      type: 'meeting_room',
      capacity: 12,
      companyId: companies[0].id,
    },
    {
      name: 'Phone Booth A',
      description: 'Cabina insonorizada para llamadas',
      status: ResourceStatus.AVAILABLE,
      location: 'Planta 1',
      type: 'phone_booth',
      companyId: companies[0].id,
    },
    {
      name: 'Desk 101',
      description: 'Puesto individual junto a ventana',
      status: ResourceStatus.AVAILABLE,
      location: 'Planta 1',
      type: 'desk',
      companyId: companies[0].id,
    },
    {
      name: 'Desk 102',
      description: 'Puesto individual',
      status: ResourceStatus.UNAVAILABLE,
      location: 'Planta 1',
      type: 'desk',
      companyId: companies[0].id,
    },
    // Spaces Diagonal
    {
      name: 'Boardroom',
      description: 'Sala ejecutiva para 20 personas',
      status: ResourceStatus.AVAILABLE,
      location: 'Planta 5',
      type: 'meeting_room',
      capacity: 20,
      companyId: companies[1].id,
    },
    {
      name: 'Sala Miró',
      description: 'Sala creativa para 6 personas',
      status: ResourceStatus.MAINTENANCE,
      location: 'Planta 2',
      type: 'meeting_room',
      capacity: 6,
      companyId: companies[1].id,
    },
    {
      name: 'Lounge Nord',
      description: 'Zona lounge con sofás',
      status: ResourceStatus.AVAILABLE,
      location: 'Planta 1',
      type: 'lounge',
      companyId: companies[1].id,
    },
    {
      name: 'Parking A1',
      description: 'Plaza de parking cubierta',
      status: ResourceStatus.AVAILABLE,
      location: 'Sótano 1',
      type: 'parking',
      companyId: companies[1].id,
    },
    {
      name: 'Desk Premium 01',
      description: 'Puesto standing desk',
      status: ResourceStatus.AVAILABLE,
      location: 'Planta 3',
      type: 'desk',
      companyId: companies[1].id,
    },
    // MOB Makers
    {
      name: 'Maker Lab',
      description: 'Taller equipado con impresoras 3D',
      status: ResourceStatus.AVAILABLE,
      location: 'Planta 0',
      type: 'meeting_room',
      capacity: 10,
      companyId: companies[2].id,
    },
    {
      name: 'Sala Dalí',
      description: 'Sala de presentaciones',
      status: ResourceStatus.AVAILABLE,
      location: 'Planta 1',
      type: 'meeting_room',
      capacity: 15,
      companyId: companies[2].id,
    },
    {
      name: 'Phone Booth B',
      description: 'Cabina para videollamadas',
      status: ResourceStatus.AVAILABLE,
      location: 'Planta 1',
      type: 'phone_booth',
      companyId: companies[2].id,
    },
    {
      name: 'Desk Creativo 01',
      description: 'Puesto en zona creativa',
      status: ResourceStatus.AVAILABLE,
      location: 'Planta 2',
      type: 'desk',
      companyId: companies[2].id,
    },
    {
      name: 'Desk Creativo 02',
      description: 'Puesto en zona creativa',
      status: ResourceStatus.UNAVAILABLE,
      location: 'Planta 2',
      type: 'desk',
      companyId: companies[2].id,
    },
  ]);
  console.log(`📦 ${resources.length} recursos insertados`);

  // ── Reservas ──────────────────────────────────────────────────────────────
  const h = (hoursFromNow: number) =>
    new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const alice = users[4],
    bob = users[5],
    carol = users[6],
    dave = users[7],
    eve = users[8];

  await reservationRepo.save([
    {
      userId: alice.id,
      resourceId: resources[0].id,
      startTime: h(1),
      endTime: h(3),
      status: ReservationStatus.CONFIRMED,
    },
    {
      userId: bob.id,
      resourceId: resources[1].id,
      startTime: h(2),
      endTime: h(4),
      status: ReservationStatus.CONFIRMED,
    },
    {
      userId: carol.id,
      resourceId: resources[5].id,
      startTime: h(24),
      endTime: h(26),
      status: ReservationStatus.CONFIRMED,
    },
    {
      userId: dave.id,
      resourceId: resources[11].id,
      startTime: h(48),
      endTime: h(50),
      status: ReservationStatus.CONFIRMED,
    },
    {
      userId: eve.id,
      resourceId: resources[3].id,
      startTime: h(-5),
      endTime: h(-3),
      status: ReservationStatus.COMPLETED,
    },
    {
      userId: alice.id,
      resourceId: resources[6].id,
      startTime: h(10),
      endTime: h(12),
      status: ReservationStatus.CANCELLED,
    },
    {
      userId: bob.id,
      resourceId: resources[9].id,
      startTime: h(72),
      endTime: h(74),
      status: ReservationStatus.CONFIRMED,
    },
    {
      userId: carol.id,
      resourceId: resources[2].id,
      startTime: h(-10),
      endTime: h(-8),
      status: ReservationStatus.COMPLETED,
    },
  ]);
  console.log('📅 Reservas insertadas');

  await AppDataSource.destroy();
  console.log('✅ Seed completado');
}

seed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
