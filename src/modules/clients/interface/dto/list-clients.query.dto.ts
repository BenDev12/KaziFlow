import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { CallCycle, ClientPriority } from '../../domain/entities/client.entity';

const CALL_CYCLES: CallCycle[] = ['Weekly', 'Bi-weekly', 'Monthly'];
const PRIORITIES: ClientPriority[] = ['hot', 'warm', 'cold'];

export class ListClientsQueryDto {
  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsEnum(PRIORITIES)
  priority?: ClientPriority;

  @ApiPropertyOptional({ enum: CALL_CYCLES })
  @IsOptional()
  @IsIn(CALL_CYCLES)
  callCycle?: CallCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
