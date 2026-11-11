export type Role = 'EMPLOYEE' | 'HRD_ADMIN';

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE';

export type LoginResult = {
  accessToken: string;
  expiresIn: number;
  employeeId: number;
  role: Role;
};

export type Employee = {
  employeeId: number;
  name: string;
  email: string;
  department: string;
  position: string;
  employmentStatus: EmploymentStatus;
  createdAt: string;
  updatedAt: string;
};

/** What POST /employees returns: the employee plus the login that was created with it. */
export type CreatedEmployee = Employee & {
  username: string;
  role: Role;
};

export type AttendanceRecord = {
  recordId: number;
  employeeId: number;
  /** UTC instant as an ISO 8601 string; convert to local time only when displaying it. */
  checkedInAt: string;
  /** The calendar date the check-in counts for, in YYYY-MM-DD format (decided by the server, in WIB). */
  workDate: string;
  photoUrl: string;
};

export type EmployeeSummary = {
  employeeId: number;
  name: string;
  department: string;
};

/** A record in HRD's list. `employee` is null when the employee service could not be reached. */
export type AttendanceRecordWithEmployee = AttendanceRecord & {
  employee: EmployeeSummary | null;
};

/** The shape of every list the API returns. */
export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ApiErrorBody = {
  statusCode: number;
  message: string | string[];
  error?: string;
};
