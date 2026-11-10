import {
  type CheckInPayload,
  type FindTodayPayload,
  type FindAttendancePayload,
  type FindPhotoPayload,
  ATTENDANCE_PATTERNS,
} from '@app/common';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AttendanceRecordsService } from './attendance-records.service';

@Controller('attendance-records')
export class AttendanceRecordsController {
  constructor(
    private readonly attendanceRecordsService: AttendanceRecordsService,
  ) {}

  @MessagePattern(ATTENDANCE_PATTERNS.CHECK_IN)
  checkIn(@Payload() payload: CheckInPayload) {
    return this.attendanceRecordsService.checkIn(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.FIND_TODAY)
  findToday(@Payload() payload: FindTodayPayload) {
    return this.attendanceRecordsService.findToday(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.FIND_ALL)
  findAll(@Payload() payload: FindAttendancePayload) {
    return this.attendanceRecordsService.findAll(payload);
  }

  @MessagePattern(ATTENDANCE_PATTERNS.FIND_PHOTO)
  findPhoto(@Payload() payload: FindPhotoPayload) {
    return this.attendanceRecordsService.findPhoto(payload);
  }
}
