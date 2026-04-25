// src/reservations/reservations.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reservation, ReservationStatus } from './entities/reservations.entity';
import { ResourcesService } from '../resources/resources.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockReservation = {
  id: 1,
  userId: 1,
  resourceId: 1,
  startTime: new Date('2026-05-01T10:00:00Z'),
  endTime: new Date('2026-05-01T12:00:00Z'),
  status: ReservationStatus.CONFIRMED,
};

const mockRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockResourcesService = {
  findOne: jest.fn(),
};

describe('ReservationsService', () => {
  let service: ReservationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: getRepositoryToken(Reservation), useValue: mockRepository },
        { provide: ResourcesService, useValue: mockResourcesService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    jest.clearAllMocks();
  });

  it('should create a reservation when no overlap exists', async () => {
    mockResourcesService.findOne.mockResolvedValue({ id: 1 });
    mockRepository.findOne.mockResolvedValue(null); // no hay solapamiento
    mockRepository.create.mockReturnValue(mockReservation);
    mockRepository.save.mockResolvedValue(mockReservation);

    const result = await service.create(1, {
      resourceId: 1,
      startTime: new Date('2026-05-01T10:00:00Z'),
      endTime: new Date('2026-05-01T12:00:00Z'),
    });

    expect(result.status).toBe(ReservationStatus.CONFIRMED);
  });

  it('should throw BadRequestException when overlap exists', async () => {
    mockResourcesService.findOne.mockResolvedValue({ id: 1 });
    mockRepository.findOne.mockResolvedValue(mockReservation); // hay solapamiento

    await expect(
      service.create(1, {
        resourceId: 1,
        startTime: new Date('2026-05-01T11:00:00Z'),
        endTime: new Date('2026-05-01T13:00:00Z'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when startTime >= endTime', async () => {
    mockResourcesService.findOne.mockResolvedValue({ id: 1 });

    await expect(
      service.create(1, {
        resourceId: 1,
        startTime: new Date('2026-05-01T12:00:00Z'),
        endTime: new Date('2026-05-01T10:00:00Z'),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when reservation does not exist on updateStatus', async () => {
    mockRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateStatus(
        999,
        { status: ReservationStatus.CANCELLED },
        1,
        'user',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
