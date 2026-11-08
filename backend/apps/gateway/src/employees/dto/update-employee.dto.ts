import { PartialType } from "@nestjs/mapped-types";
import { CreateEmployeeDto } from "./create-employee.dto";
import { IsOptional, IsEnum } from "class-validator";
import { EmploymentStatus } from "@app/common";
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @IsOptional() @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;
}