import { Controller, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './employee.entity';
import { MessagePattern } from '@nestjs/microservices';
import { EMPLOYEE_PATTERNS } from '@app/common';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  findAll(): Promise<Employee[]> {
    return this.employeesRepository.find();
  }
}

