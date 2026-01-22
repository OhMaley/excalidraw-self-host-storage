export class HttpError extends Error {
    status: number;
    statusText: string;

    constructor(status: number, statusText: string, message?: string) {
        super(message ?? `HTTP ${status}`);
        this.status = status;
        this.statusText = statusText;
    }
}
