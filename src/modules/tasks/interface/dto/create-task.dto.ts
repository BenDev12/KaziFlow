import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

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
