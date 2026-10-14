import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class WorkflowStageDto {
  @ApiProperty({ description: 'Stable id you choose, referenced by nextStageIds (e.g. "intake").' })
  @IsString()
  @MinLength(1)
  id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  departmentId!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklistTemplate?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Stage ids to spawn as new tasks once this stage is done.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nextStageIds?: string[];
}

export class CreateWorkflowTemplateDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ description: 'Must match one of the stage ids below.' })
  @IsString()
  @MinLength(1)
  entryStageId!: string;

  @ApiProperty({ type: [WorkflowStageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStageDto)
  stages!: WorkflowStageDto[];
}
