import { Module } from '@nestjs/common';
import { AttendanceRecordsService } from './attendance-records.service';
import { AttendanceRecordsController } from './attendance-records.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from './attendance-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceRecord])],
  controllers: [AttendanceRecordsController],
  providers: [AttendanceRecordsService],
})
export class AttendanceRecordsModule {}
