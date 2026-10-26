import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateGmailIntegrationDto {
  @ApiPropertyOptional({
    description: 'Leave unset to clear — the integration then stops polling.',
  })
  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}
