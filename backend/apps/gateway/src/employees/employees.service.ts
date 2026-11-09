import {
  FindEmployeesPayload,
  EMPLOYEE_PATTERNS,
  AUTH_PATTERNS,
  CreateCredentialPayload,
  EmploymentStatus,
  SetActivePayload,
  UpdateEmployeePayload,
  EmployeeView,
  Role,
  PaginatedResult,
} from '@app/common';
import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { EMPLOYEE_SERVICE, AUTH_SERVICE } from '../clients.constant';
import { CreateEmployeeWithLoginDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
  ) {}

  findAll(query: FindEmployeesPayload) {
    return firstValueFrom(
      this.employeeClient.send<PaginatedResult<EmployeeView>>(
        EMPLOYEE_PATTERNS.FIND_ALL,
        query,
      ),
    );
  }

  findOne(employeeId: number) {
    return firstValueFrom(
      this.employeeClient.send<EmployeeView>(EMPLOYEE_PATTERNS.FIND_ONE, {
        employeeId,
      }),
    );
  }

  async create(dto: CreateEmployeeWithLoginDto) {
    const { username, password, ...employeeFields } = dto;

    // Check if username is taken
    if (
      await firstValueFrom(
        this.authClient.send<boolean>(AUTH_PATTERNS.USERNAME_EXISTS, {
          username,
        }),
      )
    ) {
      throw new ConflictException('Username already exists');
    }

    // Create employee wihout credential
    const newEmployee = await firstValueFrom(
      this.employeeClient.send<EmployeeView>(
        EMPLOYEE_PATTERNS.CREATE,
        employeeFields,
      ),
    );
    const credentialPayload: CreateCredentialPayload = {
      employeeId: newEmployee.employeeId,
      username: username,
      password: password,
      role: Role.EMPLOYEE,
    };
    // Create credential
    try {
      await firstValueFrom(
        this.authClient.send(
          AUTH_PATTERNS.CREATE_CREDENTIAL,
          credentialPayload,
        ),
      );
    } catch (error) {
      try {
        await firstValueFrom(
          this.employeeClient.send(EMPLOYEE_PATTERNS.REMOVE, {
            employeeId: newEmployee.employeeId,
          }),
        );
      } catch (removeError) {
        this.logger.error(
          `Compensation failed: employee ${newEmployee.employeeId} has no credential and was not removed`,
          removeError,
        );
      }
      throw error;
    }
    return {
      ...newEmployee,
      username,
      role: Role.EMPLOYEE,
    };
  }

  async update(employeeId: number, dto: UpdateEmployeeDto) {
    // Disable auth if emplooyee is inactive
    if (dto.employmentStatus === EmploymentStatus.INACTIVE) {
      const setActivePayload: SetActivePayload = {
        employeeId,
        isActive: false,
      };
      await firstValueFrom(
        this.authClient.send(AUTH_PATTERNS.SET_ACTIVE, setActivePayload),
      );
    }

    // Update employee
    const updatePayload: UpdateEmployeePayload = { employeeId, changes: dto };
    const updatedEmployee = await firstValueFrom(
      this.employeeClient.send<EmployeeView>(
        EMPLOYEE_PATTERNS.UPDATE,
        updatePayload,
      ),
    );

    if (dto.employmentStatus === EmploymentStatus.ACTIVE) {
      const setActivePayload: SetActivePayload = { employeeId, isActive: true };
      await firstValueFrom(
        this.authClient.send(AUTH_PATTERNS.SET_ACTIVE, setActivePayload),
      );
    }

    return updatedEmployee;
  }
}
