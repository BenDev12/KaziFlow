import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DepartmentsModule } from '../departments/departments.module';
import { ORGANIZATION_REPOSITORY } from './domain/repositories/organization.repository.port';
import { USER_REPOSITORY } from './domain/repositories/user.repository.port';
import { INVITE_REPOSITORY } from './domain/repositories/invite.repository.port';
import { EMAIL_SERVICE } from './application/ports/email.port';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { TOKEN_SERVICE } from './application/ports/token-service.port';
import { AcceptInviteUseCase } from './application/use-cases/accept-invite.use-case';
import { CreateInviteUseCase } from './application/use-cases/create-invite.use-case';
import { CreateOrganizationUseCase } from './application/use-cases/create-organization.use-case';
import { GetInviteByTokenUseCase } from './application/use-cases/get-invite-by-token.use-case';
import { ListInvitesUseCase } from './application/use-cases/list-invites.use-case';
import { ListOrgMembersUseCase } from './application/use-cases/list-org-members.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { RevokeInviteUseCase } from './application/use-cases/revoke-invite.use-case';
import { SignupUseCase } from './application/use-cases/signup.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { InviteDocument, InviteSchema } from './infrastructure/schemas/invite.schema';
import {
  OrganizationDocument,
  OrganizationSchema,
} from './infrastructure/schemas/organization.schema';
import { UserDocument, UserSchema } from './infrastructure/schemas/user.schema';
import { InviteMongoRepository } from './infrastructure/repositories/invite.mongo.repository';
import { OrganizationMongoRepository } from './infrastructure/repositories/organization.mongo.repository';
import { UserMongoRepository } from './infrastructure/repositories/user.mongo.repository';
import { Argon2PasswordHasher } from './infrastructure/services/argon2-password-hasher';
import { JwtTokenService } from './infrastructure/services/jwt-token.service';
import { ResendEmailService } from './infrastructure/services/resend-email.service';
import { AuthController } from './interface/controllers/auth.controller';
import { InvitesController } from './interface/controllers/invites.controller';
import { OrganizationController } from './interface/controllers/organization.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrganizationDocument.name, schema: OrganizationSchema },
      { name: UserDocument.name, schema: UserSchema },
      { name: InviteDocument.name, schema: InviteSchema },
    ]),
    // Invites reference a department; DepartmentsModule in turn needs
    // USER_REPOSITORY (to block deleting a department with members still
    // in it) — a genuine mutual reference, not a layering mistake.
    forwardRef(() => DepartmentsModule),
  ],
  controllers: [AuthController, OrganizationController, InvitesController],
  providers: [
    { provide: ORGANIZATION_REPOSITORY, useClass: OrganizationMongoRepository },
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
    { provide: INVITE_REPOSITORY, useClass: InviteMongoRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: EMAIL_SERVICE, useClass: ResendEmailService },
    SignupUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    CreateOrganizationUseCase,
    ListOrgMembersUseCase,
    UpdateProfileUseCase,
    CreateInviteUseCase,
    ListInvitesUseCase,
    RevokeInviteUseCase,
    GetInviteByTokenUseCase,
    AcceptInviteUseCase,
  ],
  exports: [USER_REPOSITORY, ORGANIZATION_REPOSITORY],
})
export class IamModule {}
