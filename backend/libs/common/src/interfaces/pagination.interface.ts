// libs/common/src/interfaces/pagination.interface.ts
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}