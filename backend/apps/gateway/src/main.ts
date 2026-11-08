import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { ValidationPipe } from '@nestjs/common';
import { RpcToHttpExceptionFilter } from './filters/rpc-to-http-exception.filters';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new RpcToHttpExceptionFilter());
  await app.listen(process.env.port ?? 3000);
}
bootstrap();