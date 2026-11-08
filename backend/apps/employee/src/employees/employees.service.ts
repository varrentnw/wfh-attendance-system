import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository, FindOptionsWhere, Like } from 'typeorm';
import { Employee } from './employee.entity';
import { CreateEmployeePayload, FindEmployeePayload, FindEmployeesPayload, PaginatedResult, UpdateEmployeePayload } from '@app/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepository: Repository<Employee>,
  ) {}

  async create(payload: CreateEmployeePayload): Promise<Employee> {
    try {
      return await this.employeesRepository.save(this.employeesRepository.create(payload));
    } catch (error) {
      if (this.isDuplicateEntry(error, 'uq_employees_email')) {
        throw new RpcException({ statusCode: 409, message: 'Email already exists' });
      }
      throw error;
    }
  }

  async findAll(query: FindEmployeesPayload): Promise<PaginatedResult<Employee>> {
    const { search, department, employmentStatus, page, pageSize } = query;

    const base: FindOptionsWhere<Employee> = {};
    if (department) base.department = department;
    if (employmentStatus) base.employmentStatus = employmentStatus;

    // An array of conditions means OR: match on name OR on email
    const where = search
      ? [
          { ...base, name: Like(`%${search}%`) },
          { ...base, email: Like(`%${search}%`) },
        ]
      : base;

    const [items, total] = await this.employeesRepository.findAndCount({
      where,
      order: { name: 'ASC', employeeId: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, page, pageSize, total };
  }

  async findOne(employeeId: number): Promise<Employee> {
    const employee = await this.employeesRepository.findOneBy({ employeeId });
    if (!employee) {
      throw new RpcException({ statusCode: 404, message: 'Employee not found' });
    }
    return employee;
  }

  async update({ employeeId, changes }: UpdateEmployeePayload): Promise<Employee> {
    const employee = await this.findOne(employeeId);   // throws the 404 if missing
    this.employeesRepository.merge(employee, changes);
    try {
      return await this.employeesRepository.save(employee);
    } catch (error) {
      if (this.isDuplicateEntry(error, 'uq_employees_email')) {
        throw new RpcException({ statusCode: 409, message: 'Email already exists' });
      }
      throw error;
    }
  }

  private isDuplicateEntry(error: unknown, constraint: string): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY' &&
      error.message.includes(constraint)
    );
  }
}
