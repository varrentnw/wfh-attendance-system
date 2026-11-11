import { NestFactory } from '@nestjs/core';
import { AttendanceModule } from './attendance.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AttendanceModule);
  const config = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: 'localhost',
      port: Number(config.getOrThrow<string>('ATTENDANCE_SERVICE_PORT')),
    },
  });

  await app.startAllMicroservices();
}
void bootstrap();
