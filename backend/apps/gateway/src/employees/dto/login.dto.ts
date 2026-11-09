import { LoginPayload } from '@app/common';
import { IsNotEmpty, IsString, Max, MaxLength } from 'class-validator';

export class LoginDto implements LoginPayload {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}
