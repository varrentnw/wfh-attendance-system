import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { toWorkDate } from './work-date';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOptionsWhere,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  QueryFailedError,
} from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';
import {
  AttendanceRecordView,
  CheckInPayload,
  FindAttendancePayload,
  FindPhotoPayload,
  FindTodayPayload,
  PaginatedResult,
  PhotoResult,
} from '@app/common';
@Injectable()
export class AttendanceRecordsService {
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    config: ConfigService,
  ) {
    this.uploadDir = path.resolve(
      config.getOrThrow<string>('ATTENDANCE_UPLOAD_DIR'),
    );
  }

  async checkIn({
    employeeId,
    photoBase64,
    mimeType,
  }: CheckInPayload): Promise<AttendanceRecordView> {
    const checkedInAt = new Date(); // the server's clock, never the client's
    const workDate = toWorkDate(checkedInAt);
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    const photoPath = `${workDate}/${randomUUID()}.${extension}`; // relative, server-generated

    const saved = await this.saveRecord(
      this.attendanceRepository.create({
        employeeId,
        checkedInAt,
        workDate,
        photoPath,
      }),
    );

    try {
      const absolutePath = path.join(this.uploadDir, photoPath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, Buffer.from(photoBase64, 'base64'));
    } catch (error) {
      await this.attendanceRepository.delete({ recordId: saved.recordId }); // no record without a photo
      throw error;
    }

    return this.toView(saved);
  }

  async findToday({
    employeeId,
  }: FindTodayPayload): Promise<AttendanceRecordView> {
    const record = await this.attendanceRepository.findOneBy({
      employeeId,
      workDate: toWorkDate(new Date()),
    });
    if (!record) {
      throw new RpcException({
        statusCode: 404,
        message: 'Not checked in today',
      });
    }
    return this.toView(record);
  }

  async findAll({
    employeeId,
    from,
    to,
    page,
    pageSize,
  }: FindAttendancePayload): Promise<PaginatedResult<AttendanceRecordView>> {
    const where: FindOptionsWhere<AttendanceRecord> = {};
    if (employeeId) where.employeeId = employeeId;
    if (from && to) where.workDate = Between(from, to);
    else if (from) where.workDate = MoreThanOrEqual(from);
    else if (to) where.workDate = LessThanOrEqual(to);

    const [records, total] = await this.attendanceRepository.findAndCount({
      where,
      order: { checkedInAt: 'DESC', recordId: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return {
      items: records.map((record) => this.toView(record)),
      page,
      pageSize,
      total,
    };
  }

  async findPhoto({ recordId }: FindPhotoPayload): Promise<PhotoResult> {
    const record = await this.attendanceRepository.findOneBy({ recordId });
    if (!record) {
      throw new RpcException({
        statusCode: 404,
        message: 'Attendance record not found',
      });
    }
    const data = await readFile(path.join(this.uploadDir, record.photoPath));
    const mimeType = record.photoPath.endsWith('.png')
      ? 'image/png'
      : 'image/jpeg';
    return { mimeType, photoBase64: data.toString('base64') };
  }

  private async saveRecord(
    record: AttendanceRecord,
  ): Promise<AttendanceRecord> {
    // YOU WRITE: save the record; translate the duplicate into
    // a 409 "Already checked in today"; re-throw anything else
    try {
      return await this.attendanceRepository.save(record);
    } catch (error) {
      if (this.isDuplicateEntry(error, 'uq_attendance_employee_day')) {
        throw new RpcException({
          statusCode: 409,
          message: 'Already checked in today',
        });
      }
      throw error;
    }
  }

  private toView(record: AttendanceRecord): AttendanceRecordView {
    return {
      recordId: record.recordId,
      employeeId: record.employeeId,
      checkedInAt: record.checkedInAt.toISOString(),
      workDate: record.workDate,
      photoUrl: `/attendance-records/${record.recordId}/photo`,
    };
  }

  private isDuplicateEntry(error: unknown, constraint: string): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY' &&
      error.message.includes(constraint)
    );
  }
}
