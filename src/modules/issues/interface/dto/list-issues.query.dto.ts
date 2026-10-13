import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { IssueStatus } from '../../domain/entities/issue.entity';

const STATUSES: IssueStatus[] = ['open', 'resolved'];

export class ListIssuesQueryDto {
  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: IssueStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;
}
