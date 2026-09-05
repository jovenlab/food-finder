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

// Convenience creators. Using these keeps status codes consistent instead of
// scattering magic numbers through the code.

// 400 - the caller sent us something invalid. Their fault.
export function badRequest(message: string, code = "BAD_REQUEST") {
  return new AppError(400, message, code);
}

// 404 - we understood the request but have nothing to return.
export function notFound(message: string, code = "NOT_FOUND") {
  return new AppError(404, message, code);
}

// 502 - WE are fine, but a service we depend on (Open Food Facts, Stripe)
// answered with an error or with something we could not understand.
// Distinguishing this from a 500 matters: 500 says "our bug", 502 says
// "someone else's outage", and they need completely different debugging.
export function badGateway(message: string, code = "EXTERNAL_API_ERROR") {
  return new AppError(502, message, code);
}

// 503 - we are running, but something we need right now is not available
// (typically the database). Distinct from 500: nothing is broken in our code,
// so the honest answer is "try later", not "we have a bug".
export function serviceUnavailable(message: string, code = "SERVICE_UNAVAILABLE") {
  return new AppError(503, message, code);
}

// 504 - a service we depend on did not answer in time.
export function gatewayTimeout(message: string, code = "EXTERNAL_API_TIMEOUT") {
  return new AppError(504, message, code);
}
