import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResolveIssueDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  note!: string;
}
