import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EMPLOYEE_SERVICE } from '../clients.constant';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: EMPLOYEE_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.getOrThrow<string>('EMPLOYEE_SERVICE_HOST'),
            port: Number(config.getOrThrow<string>('EMPLOYEE_SERVICE_PORT')),
          },
        }),
      },
    ]),
  ],
  controllers: [EmployeesController],
})
export class EmployeesModule {}
