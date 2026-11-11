import { ApiError, request, requestBlob, toQueryString } from './client';
import type {
  AttendanceRecord,
  AttendanceRecordWithEmployee,
  PaginatedResult,
} from '../types/api';

export type AttendanceListQuery = {
  employeeId?: number;
  /** Work dates in YYYY-MM-DD format, both inclusive. */
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

/**
 * Returns today's record, or null when the employee has not checked in yet.
 * The API answers 404 in that case, but for this page it is a normal state, not a failure.
 */
export async function getTodayRecord(): Promise<AttendanceRecord | null> {
  try {
    return await request<AttendanceRecord>('/me/attendance-records/today');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export function checkIn(photo: File): Promise<AttendanceRecord> {
  const formData = new FormData();
  formData.append('photo', photo); // the field name the gateway expects
  return request<AttendanceRecord>('/attendance-records', {
    method: 'POST',
    body: formData,
  });
}

export function listAttendanceRecords(
  query: AttendanceListQuery,
): Promise<PaginatedResult<AttendanceRecordWithEmployee>> {
  return request<PaginatedResult<AttendanceRecordWithEmployee>>(
    `/attendance-records${toQueryString(query)}`,
  );
}

/**
 * Downloads a photo as binary data. An <img src> cannot do this itself,
 * because the browser does not attach the Authorization header to image requests.
 */
export function fetchAttendancePhoto(recordId: number): Promise<Blob> {
  return requestBlob(`/attendance-records/${recordId}/photo`);
}
