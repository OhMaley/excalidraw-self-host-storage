export const HttpStatus = {
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
