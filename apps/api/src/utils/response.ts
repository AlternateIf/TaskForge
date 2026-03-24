export interface SuccessResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
    totalCount?: number;
  };
}

export function success<T>(data: T): SuccessResponse<T> {
  return { data };
}

export function paginated<T>(
  items: T[],
  cursor: string | null,
  hasMore: boolean,
  totalCount?: number,
): PaginatedResponse<T> {
  const meta: PaginatedResponse<T>['meta'] = { cursor, hasMore };
  if (totalCount !== undefined) {
    meta.totalCount = totalCount;
  }
  return { data: items, meta };
}
