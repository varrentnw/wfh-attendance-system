import { ConfigService } from '@nestjs/config';
import {
  ClientsProviderAsyncOptions,
  Transport,
  ClientsModule,
} from '@nestjs/microservices';
import {
  ATTENDANCE_SERVICE,
  AUTH_SERVICE,
  EMPLOYEE_SERVICE,
} from '../clients.constant';
import { Module } from '@nestjs/common';

function tcpClient(name: string, prefix: string): ClientsProviderAsyncOptions {
  return {
    name,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      transport: Transport.TCP,
      options: {
        host: config.getOrThrow<string>(`${prefix}_SERVICE_HOST`),
        port: Number(config.getOrThrow<string>(`${prefix}_SERVICE_PORT`)),
      },
    }),
  };
}

@Module({
  imports: [
    ClientsModule.registerAsync([
      tcpClient(AUTH_SERVICE, 'AUTH'),
      tcpClient(EMPLOYEE_SERVICE, 'EMPLOYEE'),
      tcpClient(ATTENDANCE_SERVICE, 'ATTENDANCE'),
    ]),
  ],
  exports: [ClientsModule],
})
export class ServiceClientsModule {}
