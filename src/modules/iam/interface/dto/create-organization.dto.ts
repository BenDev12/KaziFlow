import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  domain!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  industry!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  timezone!: string;
}
