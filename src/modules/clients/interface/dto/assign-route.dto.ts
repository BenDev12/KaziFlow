import { ApiProperty } from '@nestjs/swagger';
import { IsString, ValidateIf } from 'class-validator';

export class AssignRouteDto {
  /**
   * Always present: either a route id or an explicit `null` to remove the
   * office from whatever route it's on. `@IsOptional()` only skips
   * `undefined`, not `null`, so `ValidateIf` is used to let `null` through
   * without running `@IsString()` against it.
   */
  @ApiProperty({ type: String, nullable: true })
  @ValidateIf((o: AssignRouteDto) => o.routeId !== null)
  @IsString()
  routeId!: string | null;
}
