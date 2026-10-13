import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ActivityType } from '../../domain/entities/activity.entity';

const ACTIVITY_TYPES: ActivityType[] = [
  'office-visit',
  'phone-call',
  'lunch',
  'dinner',
  'site-tour',
];

export class LogActivityDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  clientId!: string;

  @ApiProperty({ enum: ACTIVITY_TYPES })
  @IsIn(ACTIVITY_TYPES)
  activityType!: ActivityType;

  @ApiProperty()
  @IsString()
  personSpokenTo!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  notes!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  raisedIssue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  createdTask?: boolean;
}
