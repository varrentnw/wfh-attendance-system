import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ServiceClientsModule } from '../clients/service-clients.module';

@Module({
  imports: [ServiceClientsModule],
  controllers: [AuthController],
})
export class AuthModule {}
