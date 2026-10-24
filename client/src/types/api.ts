// Shapes of every API response (agreed in Part 0, Step 4).

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface ApiPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: ApiPaginationMeta;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}
