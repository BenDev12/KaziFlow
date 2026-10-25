import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsOptional, ValidateNested } from 'class-validator';
import {
  CallCycle,
  ClientChangeRequestType,
  VisitTimeSlot,
} from '../../domain/entities/client.entity';
import { ContactDto } from './create-client.dto';

const CHANGE_REQUEST_TYPES: ClientChangeRequestType[] = ['contacts', 'visitPreferences'];
const CALL_CYCLES: CallCycle[] = ['Weekly', 'Bi-weekly', 'Monthly'];
const VISIT_TIME_SLOTS: VisitTimeSlot[] = ['morning', 'midday', 'afternoon'];

export class RequestClientChangePatchDto {
  @ApiPropertyOptional({ type: [ContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts?: ContactDto[];

  @ApiPropertyOptional({ enum: CALL_CYCLES })
  @IsOptional()
  @IsIn(CALL_CYCLES)
  callCycle?: CallCycle;

  @ApiPropertyOptional({ enum: VISIT_TIME_SLOTS, nullable: true })
  @IsOptional()
  @IsEnum(VISIT_TIME_SLOTS)
  preferredVisitTime?: VisitTimeSlot | null;
}

export class RequestClientChangeDto {
  @ApiProperty({ enum: CHANGE_REQUEST_TYPES })
  @IsEnum(CHANGE_REQUEST_TYPES)
  type!: ClientChangeRequestType;

  @ApiProperty({ type: RequestClientChangePatchDto })
  @ValidateNested()
  @Type(() => RequestClientChangePatchDto)
  patch!: RequestClientChangePatchDto;
}
