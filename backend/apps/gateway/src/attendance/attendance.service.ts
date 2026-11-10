import {
  CheckInPayload,
  AttendanceRecordView,
  FindTodayPayload,
  FindAttendancePayload,
  PaginatedResult,
  FindPhotoPayload,
  PhotoResult,
  FindEmployeesByIdsPayload,
  EmployeeView,
  EMPLOYEE_PATTERNS,
} from '@app/common';
import { PhotoMimeType } from '@app/common/payloads/types/photo.type';
import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { ATTENDANCE_SERVICE, EMPLOYEE_SERVICE } from '../clients.constant';
import { ATTENDANCE_PATTERNS } from '@app/common';

interface EmployeeSummary {
  employeeId: number;
  name: string;
  department: string;
}

function detectImageType(buffer: Buffer): PhotoMimeType | null {
  const PNG_SIGNATURE = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE))
    return 'image/png';
  return null;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @Inject(ATTENDANCE_SERVICE) private readonly attendanceClient: ClientProxy,
    @Inject(EMPLOYEE_SERVICE) private readonly employeeClient: ClientProxy,
  ) {}

  checkIn(employeeId: number, photo: Express.Multer.File | undefined) {
    if (!photo) throw new BadRequestException('Photo is required');
    const mimeType = detectImageType(photo.buffer);
    if (!mimeType)
      throw new BadRequestException('Photo must be a JPEG or PNG image');

    const payload: CheckInPayload = {
      employeeId,
      mimeType,
      photoBase64: photo.buffer.toString('base64'),
    };
    return firstValueFrom(
      this.attendanceClient.send<AttendanceRecordView>(
        ATTENDANCE_PATTERNS.CHECK_IN,
        payload,
      ),
    );
  }

  findToday(employeeId: number) {
    const payload: FindTodayPayload = { employeeId };
    return firstValueFrom(
      this.attendanceClient.send<AttendanceRecordView>(
        ATTENDANCE_PATTERNS.FIND_TODAY,
        payload,
      ),
    );
  }

  async findAll(query: FindAttendancePayload) {
    const result = await firstValueFrom(
      this.attendanceClient.send<PaginatedResult<AttendanceRecordView>>(
        ATTENDANCE_PATTERNS.FIND_ALL,
        query,
      ),
    );
    const employeeIds = [
      ...new Set(result.items.map((record) => record.employeeId)),
    ];
    const employees = await this.findEmployeeSummaries(employeeIds);

    return {
      ...result,
      items: result.items.map((record) => ({
        ...record,
        employee: employees.get(record.employeeId) ?? null,
      })),
    };
  }

  async findPhoto(recordId: number): Promise<StreamableFile> {
    const payload: FindPhotoPayload = { recordId };
    const photo = await firstValueFrom(
      this.attendanceClient.send<PhotoResult>(
        ATTENDANCE_PATTERNS.FIND_PHOTO,
        payload,
      ),
    );
    return new StreamableFile(Buffer.from(photo.photoBase64, 'base64'), {
      type: photo.mimeType,
    });
  }

  private async findEmployeeSummaries(
    employeeIds: number[],
  ): Promise<Map<number, EmployeeSummary>> {
    if (employeeIds.length === 0) return new Map();
    try {
      const payload: FindEmployeesByIdsPayload = { employeeIds };
      const employees = await firstValueFrom(
        this.employeeClient
          .send<EmployeeView[]>(EMPLOYEE_PATTERNS.FIND_BY_IDS, payload)
          .pipe(timeout(2000)),
      );
      return new Map(
        employees.map((e) => [
          e.employeeId,
          { employeeId: e.employeeId, name: e.name, department: e.department },
        ]),
      );
    } catch (error) {
      this.logger.warn(
        `Employee details unavailable, returning records without them: ${String(error)}`,
      );
      return new Map();
    }
  }
}
