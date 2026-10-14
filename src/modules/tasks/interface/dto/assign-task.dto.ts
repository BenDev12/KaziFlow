import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AssignTaskDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  assigneeUserId!: string;
}
