import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { ValidationPipe } from '@nestjs/common';
import { RpcToHttpExceptionFilter } from './filters/rpc-to-http-exception.filters';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new RpcToHttpExceptionFilter());
  const config = app.get(ConfigService);
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN'),
  });
  await app.listen(Number(config.get<string>('GATEWAY_PORT') ?? 3000));
}
void bootstrap();
