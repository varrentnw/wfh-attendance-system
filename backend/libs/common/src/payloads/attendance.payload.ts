import { PhotoMimeType } from './types/photo.type';

export interface CheckInPayload {
  employeeId: number;
  photoBase64: string;
  mimeType: PhotoMimeType;
}
export interface FindTodayPayload {
  employeeId: number;
}
export interface FindAttendancePayload {
  employeeId?: number;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}
export interface FindPhotoPayload {
  recordId: number;
}
export interface PhotoResult {
  mimeType: PhotoMimeType;
  photoBase64: string;
}
