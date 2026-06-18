export const HttpStatus = {
    NO_CONTENT: 204,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
} as const;

export class HttpError extends Error {
    status: number;
    statusText: string;

    constructor(status: number, statusText: string, message?: string) {
        super(message ?? `HTTP ${status}`);
        this.status = status;
        this.statusText = statusText;
    }
}

export function toHttpError(error: unknown, message: string): HttpError {
    if (error instanceof HttpError) return error;
    return new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, "Fetch error", message);
}
