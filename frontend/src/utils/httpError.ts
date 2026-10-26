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

// Thrown when the Keycloak access token couldn't be refreshed before a request
// was sent — the request was never attempted. Distinguished from HttpError
// (which means the server was reached and responded) so callers can tell a
// session/connectivity hiccup apart from a real backend error.
export class AuthError extends Error {
    constructor(message = "Failed to refresh session", options?: ErrorOptions) {
        super(message, options);
    }
}

export function toHttpError(error: unknown, message: string): HttpError {
    if (error instanceof HttpError) return error;
    return new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, "Fetch error", message);
}
