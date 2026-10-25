import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TaskPriority, TaskSource } from '../../domain/entities/task.entity';

const TASK_PRIORITIES: TaskPriority[] = ['normal', 'urgent'];
const TASK_SOURCES: TaskSource[] = ['internal', 'phone_call', 'email', 'walk_in', 'whatsapp'];

export class TaskLinkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  url!: string;
}

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ description: 'Extra detail beyond the title.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Omit for a general task not tied to a specific client/office.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  clientId?: string;

  @ApiPropertyOptional({
    description:
      "Who this is for. Omit to leave unassigned; defaults the task's department to this person's.",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  assignedToUserId?: string;

  @ApiPropertyOptional({
    description:
      'Overrides the department this task is filed under (otherwise follows the assignee, then the creator).',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES, description: 'Defaults to "normal".' })
  @IsOptional()
  @IsEnum(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    enum: TASK_SOURCES,
    description: 'Where this came from. Defaults to "internal".',
  })
  @IsOptional()
  @IsEnum(TASK_SOURCES)
  source?: TaskSource;

  @ApiPropertyOptional({
    description:
      'Omit for a task not tied to a specific logged visit (e.g. one started from a template).',
  })
  @IsOptional()
  @IsString()
  activityLogId?: string;

  @ApiPropertyOptional({ type: [TaskLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskLinkDto)
  links?: TaskLinkDto[];

  @ApiPropertyOptional({
    description:
      'Pick a WorkflowTemplate to start this task at its entry stage, overriding the department you create it in.',
  })
  @IsOptional()
  @IsString()
  templateId?: string;
}
