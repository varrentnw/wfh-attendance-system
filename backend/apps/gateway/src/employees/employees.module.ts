import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { ServiceClientsModule } from '../clients/service-clients.module';
import { EmployeesService } from './employees.service';

@Module({
  imports: [ServiceClientsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
