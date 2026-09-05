// An error that knows which HTTP status code it should become.
//
// A plain `throw new Error("Product not found")` tells us what went wrong but
// not how to answer the browser. Throwing an AppError lets any layer say
// "this is a 404" or "this is a 400", and the central error handler turns that
// into the correct HTTP response.
//
// Anything that is NOT an AppError is treated as an unexpected bug: status 500,
// and the real message is hidden from the client in production.

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, message: string, code = "ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Convenience creators for the cases we expect to need. Using these keeps the
// status codes consistent instead of scattering magic numbers through the code.

export function badRequest(message: string, code = "BAD_REQUEST") {
  return new AppError(400, message, code);
}

export function notFound(message: string, code = "NOT_FOUND") {
  return new AppError(404, message, code);
}
