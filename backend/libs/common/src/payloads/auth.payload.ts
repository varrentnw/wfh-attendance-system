import { Role } from '../enums/role.enum';

export interface LoginPayload {
  username: string;
  password: string;
}
export interface LoginResult {
  accessToken: string;
  expiresIn: number;
  employeeId: number;
  role: Role;
}
export interface CreateCredentialPayload {
  employeeId: number;
  username: string;
  password: string;
  role: Role;
}
export interface CredentialView {
  credentialId: number;
  employeeId: number;
  username: string;
  role: Role;
  isActive: boolean;
}
export interface SetActivePayload {
  employeeId: number;
  isActive: boolean;
}
export interface JwtPayload {
  sub: number;
  role: Role;
}
export interface UsernameExistsPayload {
  username: string;
}
