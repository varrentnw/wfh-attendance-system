import { Controller } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EMPLOYEE_PATTERNS } from '@app/common';
import type {
  CreateEmployeePayload,
  FindEmployeePayload,
  FindEmployeesPayload,
  UpdateEmployeePayload,
} from '@app/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @MessagePattern(EMPLOYEE_PATTERNS.CREATE)
  create(@Payload() payload: CreateEmployeePayload) {
    return this.employeesService.create(payload);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.FIND_ALL)
  findAll(@Payload() query: FindEmployeesPayload) {
    return this.employeesService.findAll(query);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.FIND_ONE)
  findOne(@Payload() { employeeId }: FindEmployeePayload) {
    return this.employeesService.findOne(employeeId);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.UPDATE)
  update(@Payload() payload: UpdateEmployeePayload) {
    return this.employeesService.update(payload);
  }

  @MessagePattern(EMPLOYEE_PATTERNS.REMOVE)
  remove(@Payload() { employeeId }: FindEmployeePayload) {
    return this.employeesService.remove(employeeId);
  }
}
