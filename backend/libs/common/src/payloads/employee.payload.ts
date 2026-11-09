import { EmploymentStatus } from '../enums/employment-status.enum';

export interface CreateEmployeePayload {
  name: string;
  email: string;
  department: string;
  position: string;
}

export interface FindEmployeesPayload {
  search?: string;
  department?: string;
  employmentStatus?: EmploymentStatus;
  page: number;
  pageSize: number;
}

export interface FindEmployeePayload {
  employeeId: number;
}

export interface UpdateEmployeePayload {
  employeeId: number;
  changes: Partial<CreateEmployeePayload> & {
    employmentStatus?: EmploymentStatus;
  };
}

export interface FindEmployeesByIdsPayload {
  employeeIds: number[];
}
