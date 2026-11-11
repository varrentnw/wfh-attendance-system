import { ApiError, request } from './client';
import type { AttendanceRecord } from '../types/api';

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
