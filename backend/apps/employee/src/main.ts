import { NestFactory } from '@nestjs/core';
import { EmployeeModule } from './employee.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(EmployeeModule);
  const config = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options:{
      host: 'localhost',
      port: Number(config.getOrThrow<string>('EMPLOYEE_SERVICE_PORT')),
    }
  });

  await app.startAllMicroservices();
}
bootstrap();
