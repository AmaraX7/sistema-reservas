import { IsEnum, IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceStatus } from '../entities/resource.entity';

export class CreateResourceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiProperty({ example: 'desk', enum: ['desk', 'meeting_room', 'lounge', 'parking'] })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiPropertyOptional({ enum: ResourceStatus }) //
  @IsEnum(ResourceStatus)
  @IsOptional()
  status?: ResourceStatus;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  companyId?: number; // solo lo usa SUPER_ADMIN, COMPANY_ADMIN lo tiene forzado en el service
}