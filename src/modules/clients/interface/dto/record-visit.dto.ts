import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RecordVisitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
