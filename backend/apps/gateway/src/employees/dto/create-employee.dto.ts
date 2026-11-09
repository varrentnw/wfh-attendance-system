import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CreateEmployeePayload } from '@app/common';

export class CreateEmployeeDto implements CreateEmployeePayload {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  department: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  position: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export class CreateEmployeeWithLoginDto extends CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
