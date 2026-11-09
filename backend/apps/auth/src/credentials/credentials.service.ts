import {
  CreateCredentialPayload,
  CredentialView,
  LoginPayload,
  LoginResult,
  SetActivePayload,
} from '@app/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Credential } from './credential.entity';
import { compare, hash } from 'bcryptjs';
import { RpcException } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CredentialsService {
  private readonly expiresInSeconds: number;
  private readonly BCRYPT_COST = 12;
  constructor(
    @InjectRepository(Credential)
    private readonly credentialsRepository: Repository<Credential>,
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.expiresInSeconds = Number(
      config.getOrThrow<string>('JWT_EXPIRES_IN_SECONDS'),
    );
  }

  async createCredential(
    payload: CreateCredentialPayload,
  ): Promise<CredentialView> {
    const passwordHash = await hash(payload.password, this.BCRYPT_COST);
    const credential = this.credentialsRepository.create({
      employeeId: payload.employeeId,
      username: payload.username,
      role: payload.role,
      isActive: true,
      passwordHash,
    });

    try {
      const saved = await this.credentialsRepository.save(credential);
      return this.toView(saved);
    } catch (error) {
      if (this.isDuplicateEntry(error, 'uq_credentials_username')) {
        throw new RpcException({
          statusCode: 409,
          message: 'Username already exists',
        });
      } else if (this.isDuplicateEntry(error, 'uq_credentials_employee')) {
        throw new RpcException({
          statusCode: 409,
          message: 'This employee already has a credential',
        });
      }
      throw error;
    }
  }

  async login(payload: LoginPayload): Promise<LoginResult> {
    const credential = await this.credentialsRepository.findOne({
      where: { username: payload.username },
      select: {
        employeeId: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    });
    if (
      credential === null ||
      credential.isActive === false ||
      !(await compare(payload.password, credential.passwordHash))
    ) {
      throw new RpcException({
        statusCode: 401,
        message: 'Invalid username or password',
      });
    }

    const signPayload = {
      sub: credential.employeeId,
      role: credential.role,
    };
    const token = await this.jwtService.signAsync(signPayload, {
      expiresIn: this.expiresInSeconds,
    });
    return {
      accessToken: token,
      expiresIn: this.expiresInSeconds,
      employeeId: credential.employeeId,
      role: credential.role,
    };
  }

  async usernameExists(username: string): Promise<boolean> {
    return this.credentialsRepository.existsBy({ username });
  }

  async setActive({
    employeeId,
    isActive,
  }: SetActivePayload): Promise<{ employeeId: number; isActive: boolean }> {
    await this.credentialsRepository.update({ employeeId }, { isActive });
    return { employeeId, isActive };
  }

  private toView(credential: Credential): CredentialView {
    return {
      credentialId: credential.credentialId,
      employeeId: credential.employeeId,
      username: credential.username,
      role: credential.role,
      isActive: credential.isActive,
    };
  }

  private isDuplicateEntry(error: unknown, constraint: string): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY' &&
      error.message.includes(constraint)
    );
  }
}
