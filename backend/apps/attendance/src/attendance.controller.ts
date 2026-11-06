import { Controller, Get } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  getHello(): string {
    return this.attendanceService.getHello();
  }
}
