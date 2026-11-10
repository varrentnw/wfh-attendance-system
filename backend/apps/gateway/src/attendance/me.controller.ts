import { Role } from '@app/common';
import { Controller, Get } from '@nestjs/common';
import { Roles, CurrentUser } from '../auth/auth.decorator';
import { AttendanceService } from './attendance.service';
import type { JwtPayload } from '@app/common';

@Controller('me')
export class MeController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(Role.EMPLOYEE)
  @Get('attendance-records/today')
  findToday(@CurrentUser() user: JwtPayload) {
    return this.attendanceService.findToday(user.sub);
  }
}
