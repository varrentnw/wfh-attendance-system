import { Controller } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_PATTERNS } from '@app/common';
import type {
  CreateCredentialPayload,
  LoginPayload,
  SetActivePayload,
  UsernameExistsPayload,
} from '@app/common';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @MessagePattern(AUTH_PATTERNS.CREATE_CREDENTIAL)
  createCredential(@Payload() payload: CreateCredentialPayload) {
    return this.credentialsService.createCredential(payload);
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() payload: LoginPayload) {
    return this.credentialsService.login(payload);
  }

  @MessagePattern(AUTH_PATTERNS.SET_ACTIVE)
  setActive(@Payload() payload: SetActivePayload) {
    return this.credentialsService.setActive(payload);
  }

  @MessagePattern(AUTH_PATTERNS.USERNAME_EXISTS)
  usernameExists(@Payload() { username }: UsernameExistsPayload) {
    return this.credentialsService.usernameExists(username);
  }
}
