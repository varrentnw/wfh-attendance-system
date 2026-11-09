import { Entity, Unique, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('attendance')
@Unique('uq_attendance_employee_day', ['employeeId', 'workDate'])
export class AttendanceRecord {
  @PrimaryGeneratedColumn({ name: 'record_id', unsigned: true })
  recordId: number;

  @Column({ name: 'employee_id', type: 'int', unsigned: true })
  employeeId: number;

  @Column({ name: 'checked_in_at', type: 'datetime' })
  checkedInAt: Date;

  @Column({ name: 'work_date', type: 'date' })
  workDate: string; // TypeORM returns MySQL DATE as 'YYYY-MM-DD'

  @Column({ name: 'photo_path', type: 'varchar', length: 255 })
  photoPath: string;
}
