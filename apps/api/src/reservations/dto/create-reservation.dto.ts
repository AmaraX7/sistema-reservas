import { Type } from 'class-transformer';
import { IsDate, IsInt, Min } from 'class-validator';

// no mando el userid poruq  me llega en el token
// sino , cualquera podria ponerl oen el body y hacer reservas por otros usuarios
export class CreateReservationDto {
  @IsInt()
  @Min(1)
  resourceId!: number;

  @IsDate()
  @Type(() => Date)
  startTime!: Date;

  @IsDate()
  @Type(() => Date)
  endTime!: Date;
}
