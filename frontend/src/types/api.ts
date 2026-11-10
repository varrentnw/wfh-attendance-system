export type Role = 'EMPLOYEE' | 'HRD_ADMIN';

export type LoginResult = {
  accessToken: string;
  expiresIn: number;
  employeeId: number;
  role: Role;
};

export type ApiErrorBody = {
  statusCode: number;
  message: string | string[];
  error?: string;
};