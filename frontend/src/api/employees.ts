import { request, toQueryString } from './client';
import type {
  CreatedEmployee,
  Employee,
  EmploymentStatus,
  PaginatedResult,
} from '../types/api';

export type EmployeeListQuery = {
  search?: string;
  department?: string;
  employmentStatus?: EmploymentStatus | '';
  page: number;
  pageSize: number;
};

export type NewEmployeeInput = {
  name: string;
  email: string;
  department: string;
  position: string;
  username: string;
  password: string;
};

export type EmployeeChanges = Partial<
  Pick<
    Employee,
    'name' | 'email' | 'department' | 'position' | 'employmentStatus'
  >
>;

export function listEmployees(
  query: EmployeeListQuery,
): Promise<PaginatedResult<Employee>> {
  return request<PaginatedResult<Employee>>(
    `/employees${toQueryString(query)}`,
  );
}

export function getEmployee(employeeId: number): Promise<Employee> {
  return request<Employee>(`/employees/${employeeId}`);
}

export function createEmployee(
  input: NewEmployeeInput,
): Promise<CreatedEmployee> {
  return request<CreatedEmployee>('/employees', {
    method: 'POST',
    body: input,
  });
}

export function updateEmployee(
  employeeId: number,
  changes: EmployeeChanges,
): Promise<Employee> {
  return request<Employee>(`/employees/${employeeId}`, {
    method: 'PATCH',
    body: changes,
  });
}
