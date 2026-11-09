import { Role} from '@app/common';
import { Controller, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles, CurrentUser } from '../auth/auth.decorator';
import { AttendanceService } from './attendance.service';
import { ListAttendanceQueryDto } from './dto/list-attendance-query.dto';
import type { JwtPayload } from '@app/common';

@Controller('attendance-records')
export class AttendanceRecordsController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(Role.EMPLOYEE)
  @Post()
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  checkIn(@CurrentUser() user: JwtPayload, @UploadedFile() photo: Express.Multer.File | undefined) {
    return this.attendanceService.checkIn(user.sub, photo);
  }

  @Roles(Role.HRD_ADMIN)
  @Get()
  findAll(@Query() query: ListAttendanceQueryDto) {
    return this.attendanceService.findAll(query);
  }

  @Roles(Role.HRD_ADMIN)
  @Get(':id/photo')
  findPhoto(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.findPhoto(id);
  }
}
