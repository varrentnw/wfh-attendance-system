import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Role } from '@app/common';

@Entity('credentials')
@Unique('uq_credentials_username', ['username'])
@Unique('uq_credentials_employee', ['employeeId'])
export class Credential {
  @PrimaryGeneratedColumn({ name: 'credential_id', unsigned: true })
  credentialId: number;

  @Column({ name: 'employee_id', type: 'int', unsigned: true })
  employeeId: number;

  @Column({ type: 'varchar', length: 50 })
  username: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.EMPLOYEE })
  role: Role;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
