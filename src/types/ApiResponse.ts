export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

export interface ApiListDataResponse<T = unknown> extends ApiResponse<{ data: T[] }> {
    count?: number;
}