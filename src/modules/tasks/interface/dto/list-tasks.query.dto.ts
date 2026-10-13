import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { TaskStatus } from '../../domain/entities/task.entity';

const STATUSES: TaskStatus[] = ['pending', 'completed'];

export class ListTasksQueryDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;
}
