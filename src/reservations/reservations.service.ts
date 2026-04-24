import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservations.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { LessThan, MoreThan } from 'typeorm';
import { DataSource } from 'typeorm';
import { Resource } from '../resources/entities/resource.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,

    private readonly dataSource: DataSource,
  ) {}

  // // SELECT * FROM products WHERE price > 100 ORDER BY price ASC LIMIT 10
  // this.productsRepository.find({
  //   where: { price: MoreThan(100) },  // necesita import de typeorm
  //   order: { price: 'ASC' },
  //   take: 10,                         // LIMIT
  // });
  async create(
    userId: number,
    dto: CreateReservationDto,
  ): Promise<Reservation> {
    // 1. Verificar que el recurso existe
    // 2. Verificar que startTime < endTime
    // 3. Detectar solapamiento
    // 4. Crear y guardar la reserva
    this.logger.log(
      `Creating reservation userId=${userId}, resourceId=${dto.resourceId}`,
    );
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const resource = await queryRunner.manager.findOne(Resource, {
        where: { id: dto.resourceId },
      });
      // hacemos lock del recurso para q otra persona no pueda crear reserva  para el mismo recurso y la misma hora a la vez,
      // y pongo la clase en el findone poruqe el queryrunner no sabe
      if (!resource)
        throw new NotFoundException(`Resource #${dto.resourceId} not found`);

      if (dto.startTime >= dto.endTime) {
        this.logger.warn(
          `Invalid reservation range userId=${userId}, resourceId=${dto.resourceId}`,
        );
        throw new BadRequestException('startTime must be before endTime');
      }
      const overlapping = await queryRunner.manager.findOne(Reservation, {
        where: {
          resource: { id: dto.resourceId },
          startTime: LessThan(dto.endTime),
          endTime: MoreThan(dto.startTime),
          status: ReservationStatus.CONFIRMED,
        },
        lock: { mode: 'pessimistic_write' },
      });
      // lock pesimista: bloqueamos las filas de reservas de este recurso para que
      // ninguna otra transacción concurrente pueda leerlas hasta que hagamos commit,
      // evitando que dos requests pasen el check de solapamiento simultáneamente y creen reservas solapadas
      if (overlapping) {
        this.logger.warn(
          `Overlapping reservation detected for resourceId=${dto.resourceId}`,
        );
        throw new BadRequestException(
          'there is an overlapping reservation for this resource and time',
        );
      }
      const reservation = queryRunner.manager.create(Reservation, {
        ...dto,
        user: { id: userId },
        resource: { id: dto.resourceId },
      });

      const savedReservation = await queryRunner.manager.save(reservation);
      this.logger.log(`Reservation created id=${savedReservation.id}`);
      await queryRunner.commitTransaction();
      return savedReservation;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      let message: string;

      if (error instanceof Error) {
        message = error.message;
      } else {
        message = String(error);
      }
      this.logger.error(
        `Failed to create reservation for userId=${userId}, resourceId=${dto.resourceId}: ${message}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    pagination: PaginationDto,
  ): Promise<{ reservations: Reservation[]; total: number }> {
    this.logger.log('Listing all reservations');
    const [reservations, total] =
      await this.reservationsRepository.findAndCount({
        take: pagination.limit, // cuántos traer
        skip: (pagination.page - 1) * pagination.limit, // cuántos saltar
      });
    return { reservations, total };
  }

  async findByUser(userId: number): Promise<Reservation[]> {
    this.logger.log(`Listing reservations for userId=${userId}`);
    return this.reservationsRepository.find({ where: { userId: userId } });
  }

  async findById(id: number): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id: id },
    });
    if (!reservation) {
      this.logger.warn(`Reservation not found: id=${id}`);
      throw new NotFoundException(`Reservation #${id} not found`);
    }
    return reservation;
  }

  async updateStatus(
    id: number,
    dto: UpdateReservationDto,
    userId: number,
    role: string,
  ): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id: id },
    });
    if (!reservation) {
      this.logger.warn(`Reservation not found for status update: id=${id}`);
      throw new NotFoundException(`Reservation #${id} not found`);
    }

    if (dto.status === ReservationStatus.CANCELLED) {
      if (reservation.userId !== userId) {
        throw new BadRequestException(
          'you can only cancel your own reservations!',
        );
      }
      reservation.status = ReservationStatus.CANCELLED;
    } else {
      if (role !== 'admin') {
        throw new BadRequestException('only admins can update to COMPLETED!');
      }
      reservation.status = ReservationStatus.COMPLETED;
    }

    await this.reservationsRepository.update(id, {
      status: reservation.status,
    });
    this.logger.log(
      `Updated reservation status id=${id}, status=${reservation.status}`,
    );
    return reservation;
  }

  async getAvailability(
    resourceId: number,
    date: string,
  ): Promise<{
    date: string;
    availableSlots: { start: string; end: string }[];
  }> {
    this.logger.log(
      `Getting availability for resourceId=${resourceId}, date=${date}`,
    );

    const OPEN_HOUR = 8;
    const CLOSE_HOUR = 20;

    const reservations = await this.reservationsRepository.find({
      where: {
        resourceId: resourceId,
        status: ReservationStatus.CONFIRMED,
        startTime: LessThan(new Date(`${date}T23:59:59.000Z`)),
        endTime: MoreThan(new Date(`${date}T00:00:00.000Z`)),
      },
    });

    const allSlots: { start: string; end: string }[] = [];
    for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour++) {
      allSlots.push({
        start: `${String(hour).padStart(2, '0')}:00`,
        end: `${String(hour + 1).padStart(2, '0')}:00`,
      });
    }

    const availableSlots = allSlots.filter((slot) => {
      const slotStart = new Date(`${date}T${slot.start}:00.000Z`);
      const slotEnd = new Date(`${date}T${slot.end}:00.000Z`);
      return !reservations.some(
        (r) => r.startTime < slotEnd && r.endTime > slotStart,
      );
    });

    return { date, availableSlots };
  }
}
