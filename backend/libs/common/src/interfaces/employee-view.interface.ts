import { EmploymentStatus } from './../enums/employment-status.enum';

export interface EmployeeView {
  employeeId: number;
  name: string;
  email: string;
  department: string;
  position: string;
  employmentStatus: EmploymentStatus;
  createdAt: string;
  updatedAt: string;
}
