import { Module } from '@nestjs/common';
import { AttendanceRecordsController } from './attendance-records.controller';
import { MeController } from './me.controller';
import { ServiceClientsModule } from '../clients/service-clients.module';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [ServiceClientsModule],
  controllers: [AttendanceRecordsController, MeController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
