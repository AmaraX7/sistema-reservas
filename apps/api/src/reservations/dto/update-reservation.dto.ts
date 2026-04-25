import { IsEnum } from 'class-validator';
import { ReservationStatus } from '../entities/reservations.entity';

export class UpdateReservationDto {
  @IsEnum(ReservationStatus)
  status!: ReservationStatus;
}
