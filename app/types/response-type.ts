export interface ResponseType<T> {
    success: boolean;
    data: T;
    message: string;
}

export interface ResponseTypeCreateSuccess {
    id: number;
    row_version: number;
}

export interface ResponseTypeCreateSuccess {
    id: number;
}

export interface ResponseTypeError {
    success: boolean;
    code: string;
    message: string;
}