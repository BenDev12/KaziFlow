import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';
import { FlagType } from '../../domain/entities/flag.entity';

const FLAG_TYPES: FlagType[] = [
  'complaint',
  'executive_visit',
  'close_opportunity',
  'payment_collection',
  'follow_up',
  'new_contact',
];

export class RaiseFlagDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  clientId!: string;

  @ApiProperty({ enum: FLAG_TYPES })
  @IsIn(FLAG_TYPES)
  flagType!: FlagType;

  @ApiProperty()
  @IsString()
  visitNote!: string;

  @ApiProperty()
  @IsString()
  personSpokenTo!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  activityLogId!: string;
}
