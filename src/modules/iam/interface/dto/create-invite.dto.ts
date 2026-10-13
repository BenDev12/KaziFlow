import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn } from 'class-validator';
import { UserRole } from '../../../../shared/infrastructure/tenancy/tenant-context';

const INVITABLE_ROLES: UserRole[] = ['org_admin', 'manager', 'agent'];

export class CreateInviteDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: INVITABLE_ROLES })
  @IsIn(INVITABLE_ROLES)
  role!: UserRole;
}
