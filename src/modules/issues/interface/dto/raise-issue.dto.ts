import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RaiseIssueDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  clientId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty()
  @IsString()
  visitNote!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  activityLogId!: string;
}
