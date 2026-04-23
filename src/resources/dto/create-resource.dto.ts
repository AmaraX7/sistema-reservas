import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ResourceStatus } from '../entities/resource.entity';

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsEnum(ResourceStatus)
  @IsOptional()
  status?: ResourceStatus;
}