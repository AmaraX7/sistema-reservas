import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, DataSource } from 'typeorm';
import { Visit, VisitStatus } from './entities/visit.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PersonRole } from '../persons/entities/person.entity';

@Injectable()
export class VisitsService {
  private readonly logger = new Logger(VisitsService.name);

  constructor(
    @InjectRepository(Visit)
    private readonly visitsRepository: Repository<Visit>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateVisitDto): Promise<Visit> {
    this.logger.log(`Creating visit doctorId=${dto.doctorId}, patientId=${dto.patientId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const clinic = await queryRunner.manager.findOne(Clinic, { where: { id: dto.clinicId } });
      if (!clinic) throw new NotFoundException(`Clinic #${dto.clinicId} not found`);

      if (dto.startTime >= dto.endTime) {
        this.logger.warn(`Invalid visit range doctorId=${dto.doctorId}`);
        throw new BadRequestException('startTime must be before endTime');
      }

      // lock pesimista: bloqueamos las filas de visitas de este doctor para que
      // ninguna otra transacción concurrente pueda leerlas hasta que hagamos commit,
      // evitando que dos requests pasen el check de solapamiento simultáneamente
      const overlapping = await queryRunner.manager.findOne(Visit, {
        where: {
          doctorId: dto.doctorId,
          startTime: LessThan(dto.endTime),
          endTime: MoreThan(dto.startTime),
          status: VisitStatus.CONFIRMED,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (overlapping) {
        this.logger.warn(`Overlapping visit detected for doctorId=${dto.doctorId}`);
        throw new BadRequestException('Doctor already has a visit in this time range');
      }

      const visit = queryRunner.manager.create(Visit, dto);
      const saved = await queryRunner.manager.save(visit);
      await queryRunner.commitTransaction();
      this.logger.log(`Visit created id=${saved.id}`);
      return saved;

    } catch (error) {
      await queryRunner.rollbackTransaction();

      let message: string;
      if (error instanceof Error) {
        message = error.message;
      } else {
        message = String(error);
      }
      this.logger.error(`Failed to create visit doctorId=${dto.doctorId}: ${message}`);
      throw error;

    } finally {
      await queryRunner.release();
    }
  }

  async findAll(pagination: PaginationDto): Promise<{ data: Visit[]; total: number }> {
    this.logger.log('Listing all visits');
    const [data, total] = await this.visitsRepository.findAndCount({
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
      relations: ['doctor', 'patient', 'clinic'],
    });
    return { data, total };
  }

  async findByPatient(patientId: number): Promise<Visit[]> {
    this.logger.log(`Listing visits for patientId=${patientId}`);
    return this.visitsRepository.find({
      where: { patientId },
      relations: ['doctor', 'clinic'],
    });
  }

  async findByDoctor(doctorId: number): Promise<Visit[]> {
    this.logger.log(`Listing visits for doctorId=${doctorId}`);
    return this.visitsRepository.find({
      where: { doctorId },
      relations: ['patient', 'clinic'],
    });
  }

  async findById(id: number): Promise<Visit> {
    const visit = await this.visitsRepository.findOne({
      where: { id },
      relations: ['doctor', 'patient', 'clinic', 'admission'],
    });
    if (!visit) {
      this.logger.warn(`Visit not found: id=${id}`);
      throw new NotFoundException(`Visit #${id} not found`);
    }
    return visit;
  }

  async updateStatus(id: number, dto: UpdateVisitDto, role: PersonRole): Promise<Visit> {
    const visit = await this.visitsRepository.findOne({ where: { id } });
    if (!visit) {
      this.logger.warn(`Visit not found for status update: id=${id}`);
      throw new NotFoundException(`Visit #${id} not found`);
    }
    if (dto.status === VisitStatus.CONFIRMED)
  throw new BadRequestException('Cannot manually set status to CONFIRMED');

    if (dto.status === VisitStatus.CANCELLED) {
      if (role === PersonRole.PATIENT)
        throw new BadRequestException('Patients cannot cancel visits directly');
      visit.status = VisitStatus.CANCELLED;
    } else {
      if (role !== PersonRole.SUPER_ADMIN && role !== PersonRole.CLINIC_ADMIN && role !== PersonRole.DOCTOR)
        throw new BadRequestException('Only admins or doctors can update visit status');
      visit.status = dto.status;
    }

    await this.visitsRepository.update(id, { status: visit.status });
    this.logger.log(`Updated visit status id=${id}, status=${visit.status}`);
    return visit;
  }

  async getDoctorAvailability(doctorId: number, date: string): Promise<{
    doctorId: number;
    date: string;
    availableSlots: { start: string; end: string }[];
  }> {
    this.logger.log(`Getting availability for doctorId=${doctorId}, date=${date}`);

    const OPEN_HOUR = 8;
    const CLOSE_HOUR = 20;

    const visits = await this.visitsRepository.find({
      where: {
        doctorId,
        status: VisitStatus.CONFIRMED,
        startTime: MoreThan(new Date(`${date}T00:00:00.000Z`)),
        endTime: LessThan(new Date(`${date}T23:59:59.000Z`)),
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
      return !visits.some((v) => v.startTime < slotEnd && v.endTime > slotStart);
    });

    return { doctorId, date, availableSlots };
  }

  async findByDate(date: string): Promise<Visit[]> {
    return this.visitsRepository
      .createQueryBuilder('visit')
      .where('DATE(visit.startTime) = :date', { date })
      .getMany();
  }
}