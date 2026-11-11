import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  const config = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      // Only this machine by default. In a container the service must accept
      // connections from the other containers, so Compose sets 0.0.0.0.
      host: config.get<string>('SERVICE_BIND_HOST') ?? 'localhost',
      port: Number(config.getOrThrow<string>('AUTH_SERVICE_PORT')),
    },
  });

  await app.startAllMicroservices();
}
void bootstrap();
