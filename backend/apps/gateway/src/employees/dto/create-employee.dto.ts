import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
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