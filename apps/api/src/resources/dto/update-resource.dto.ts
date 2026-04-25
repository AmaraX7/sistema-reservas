import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceStatus } from '../entities/resource.entity';

export class UpdateResourceDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    enum: ['desk', 'meeting_room', 'phone_booth', 'lounge', 'parking'],
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ enum: ResourceStatus })
  @IsEnum(ResourceStatus)
  @IsOptional()
  status?: ResourceStatus;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number; // útil para meeting rooms
}
