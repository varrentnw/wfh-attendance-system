import { IsOptional, IsString, MaxLength, IsEnum, IsInt, Min, Max } from "class-validator";
import { FindEmployeesPayload } from "@app/common";
import { EmploymentStatus } from "@app/common";
import { Type } from 'class-transformer'

export class ListEmployeesQueryDto implements FindEmployeesPayload {
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  @IsOptional() @IsString() @MaxLength(100)
  department?: string;

  @IsOptional() @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize: number = 20;
}