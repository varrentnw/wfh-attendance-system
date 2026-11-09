import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceRecordsService } from './attendance-records.service';

describe('AttendanceRecordsService', () => {
  let service: AttendanceRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttendanceRecordsService],
    }).compile();

    service = module.get<AttendanceRecordsService>(AttendanceRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
