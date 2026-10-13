import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { FlagStatus } from '../../domain/entities/flag.entity';

const STATUSES: FlagStatus[] = ['open', 'resolved'];

export class ListFlagsQueryDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: FlagStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;
}
