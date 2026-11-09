import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { AUTH_SERVICE } from '../clients.constant';
import { AUTH_PATTERNS } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Public } from './auth.decorator';
import { LoginDto } from '../employees/dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy) {}

  @Public()
  @Post('login')
  @HttpCode(200) // a login creates nothing, so 200, not POST's default 201
  login(@Body() dto: LoginDto) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.LOGIN, dto));
  }
}
