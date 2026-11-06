import { Injectable } from '@nestjs/common';

@Injectable()
export class AttendanceService {
  getHello(): string {
    return 'Hello World!';
  }
}
