import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  clientId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Omit for a task not tied to a specific logged visit (e.g. one started from a template).' })
  @IsOptional()
  @IsString()
  activityLogId?: string;

  @ApiPropertyOptional({
    description:
      'Pick a WorkflowTemplate to start this task at its entry stage, overriding the department you create it in.',
  })
  @IsOptional()
  @IsString()
  templateId?: string;
}
