export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Pulls a human-readable message out of a NestJS error body.
 * Nest returns `{ statusCode, message, error }` where `message` may be a string
 * or (for class-validator errors) an array of strings.
 */
export function getErrorMessage(body: unknown, fallback = "Something went wrong. Please try again.") {
  if (!body) return fallback;
  if (typeof body === "string") return body || fallback;
  if (typeof body === "object") {
    const b = body as Record<string, unknown>;
    const msg = b.message ?? (b.error as Record<string, unknown> | undefined)?.message ?? b.error;
    if (Array.isArray(msg) && msg.length) return capitalize(String(msg[0]));
    if (typeof msg === "string" && msg) return capitalize(msg);
  }
  return fallback;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
