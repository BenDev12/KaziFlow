import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';
import { RoutePurpose } from '../../domain/entities/route.entity';

const PURPOSES: RoutePurpose[] = ['follow_up', 'initial_visit', 'general'];

export class CreateRouteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: PURPOSES })
  @IsIn(PURPOSES)
  purpose!: RoutePurpose;
}
