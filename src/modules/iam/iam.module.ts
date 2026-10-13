import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ORGANIZATION_REPOSITORY } from './domain/repositories/organization.repository.port';
import { USER_REPOSITORY } from './domain/repositories/user.repository.port';
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { TOKEN_SERVICE } from './application/ports/token-service.port';
import { CreateOrganizationUseCase } from './application/use-cases/create-organization.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.use-case';
import { SignupUseCase } from './application/use-cases/signup.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import {
  OrganizationDocument,
  OrganizationSchema,
} from './infrastructure/schemas/organization.schema';
import { UserDocument, UserSchema } from './infrastructure/schemas/user.schema';
import { OrganizationMongoRepository } from './infrastructure/repositories/organization.mongo.repository';
import { UserMongoRepository } from './infrastructure/repositories/user.mongo.repository';
import { Argon2PasswordHasher } from './infrastructure/services/argon2-password-hasher';
import { JwtTokenService } from './infrastructure/services/jwt-token.service';
import { AuthController } from './interface/controllers/auth.controller';
import { OrganizationController } from './interface/controllers/organization.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrganizationDocument.name, schema: OrganizationSchema },
      { name: UserDocument.name, schema: UserSchema },
    ]),
  ],
  controllers: [AuthController, OrganizationController],
  providers: [
    { provide: ORGANIZATION_REPOSITORY, useClass: OrganizationMongoRepository },
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    SignupUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    CreateOrganizationUseCase,
    UpdateProfileUseCase,
  ],
  exports: [USER_REPOSITORY, ORGANIZATION_REPOSITORY],
})
export class IamModule {}
