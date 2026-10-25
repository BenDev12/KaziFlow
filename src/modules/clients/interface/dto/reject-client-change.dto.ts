import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectClientChangeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
