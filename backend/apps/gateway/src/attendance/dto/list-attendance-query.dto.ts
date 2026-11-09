import { FindAttendancePayload } from "@app/common";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Matches, Max, Min } from "class-validator";

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export class ListAttendanceQueryDto implements FindAttendancePayload {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  employeeId?: number;

  @IsOptional() @Matches(DATE_FORMAT, { message: 'from must be in YYYY-MM-DD format' })
  from?: string;

  @IsOptional() @Matches(DATE_FORMAT, { message: 'to must be in YYYY-MM-DD format' })
  to?: string;

  @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize: number = 20;
}