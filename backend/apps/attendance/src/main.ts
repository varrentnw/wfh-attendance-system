import { NestFactory } from '@nestjs/core';
import { AttendanceModule } from './attendance.module';

async function bootstrap() {
  const app = await NestFactory.create(AttendanceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
