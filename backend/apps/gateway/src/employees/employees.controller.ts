import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { EMPLOYEE_SERVICE } from '../clients.constant';
import { EMPLOYEE_PATTERNS } from '@app/common';

@Controller('employees')
export class EmployeesController {
  constructor(@Inject(EMPLOYEE_SERVICE) private readonly libraryClient: ClientProxy) {}

  @Get()
  findAll() {
    return firstValueFrom(this.libraryClient.send(EMPLOYEE_PATTERNS.FIND_ALL, {}));
  }
}
