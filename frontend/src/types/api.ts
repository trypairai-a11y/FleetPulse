export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface MessageResponse {
  message: string;
}
