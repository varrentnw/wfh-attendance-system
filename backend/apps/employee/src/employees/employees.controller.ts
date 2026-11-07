import { Controller } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EMPLOYEE_PATTERNS } from '@app/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @MessagePattern(EMPLOYEE_PATTERNS.FIND_ALL)
  findAll() {
    return this.employeesService.findAll();
  }
}