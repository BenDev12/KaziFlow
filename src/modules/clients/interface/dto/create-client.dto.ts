import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CallCycle, ClientPriority, VisitTimeSlot } from '../../domain/entities/client.entity';

const CALL_CYCLES: CallCycle[] = ['Weekly', 'Bi-weekly', 'Monthly'];
const PRIORITIES: ClientPriority[] = ['hot', 'warm', 'cold'];
const VISIT_TIME_SLOTS: VisitTimeSlot[] = ['morning', 'midday', 'afternoon'];

export class ContactDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  id!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class CreateClientDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty()
  @IsString()
  contact!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  phone!: string;

  @ApiProperty({ enum: CALL_CYCLES })
  @IsIn(CALL_CYCLES)
  callCycle!: CallCycle;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  address!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsEnum(PRIORITIES)
  priority?: ClientPriority;

  @ApiPropertyOptional({
    type: [ContactDto],
    description: 'Named contacts at this office, for the activity log\'s "person spoken to" picker.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts?: ContactDto[];

  @ApiPropertyOptional({ enum: VISIT_TIME_SLOTS })
  @IsOptional()
  @IsEnum(VISIT_TIME_SLOTS)
  preferredVisitTime?: VisitTimeSlot;
}
