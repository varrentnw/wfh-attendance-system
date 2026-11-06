import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

describe('AttendanceController', () => {
  let attendanceController: AttendanceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [AttendanceService],
    }).compile();

    attendanceController = app.get<AttendanceController>(AttendanceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(attendanceController.getHello()).toBe('Hello World!');
    });
  });
});
