import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { EMPLOYEE_SERVICE } from '../clients.constant';
import { EMPLOYEE_PATTERNS } from '@app/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Role } from '@app/common';
import { Roles } from '../auth/auth.decorator';

@Roles(Role.HRD_ADMIN)
@Controller('employees')
export class EmployeesController {
  constructor(@Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy) {}

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return firstValueFrom(this.employeeClient.send(EMPLOYEE_PATTERNS.CREATE, dto));
  }

  @Get()
  findAll(@Query() query: ListEmployeesQueryDto) {
    return firstValueFrom(this.employeeClient.send(EMPLOYEE_PATTERNS.FIND_ALL, query));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(this.employeeClient.send(EMPLOYEE_PATTERNS.FIND_ONE, { employeeId: id }));
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return firstValueFrom(
      this.employeeClient.send(EMPLOYEE_PATTERNS.UPDATE, { employeeId: id, changes: dto }),
    );
  }
}
