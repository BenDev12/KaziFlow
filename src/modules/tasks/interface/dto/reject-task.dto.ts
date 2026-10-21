import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectTaskDto {
  @ApiProperty({ description: 'Why this is being sent back — shown to the assignee.' })
  @IsString()
  @MinLength(1)
  reason!: string;
}
