export type Role = 'EMPLOYEE' | 'HRD_ADMIN';

export type LoginResult = {
  accessToken: string;
  expiresIn: number;
  employeeId: number;
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

export type ApiErrorBody = {
  statusCode: number;
  message: string | string[];
  error?: string;
};
