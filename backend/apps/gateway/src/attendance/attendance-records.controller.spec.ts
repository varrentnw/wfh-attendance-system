import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceRecordsController } from './attendance-records.controller';

describe('AttendanceRecordsController', () => {
  let controller: AttendanceRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceRecordsController],
    }).compile();

    controller = module.get<AttendanceRecordsController>(AttendanceRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
