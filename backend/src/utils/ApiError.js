export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message)
    this.statusCode = statusCode
    this.details = details
    Error.captureStackTrace?.(this, ApiError)
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details)
  }

  static unauthorized(message = 'Not authorized.') {
    return new ApiError(401, message)
  }

  static forbidden(message = 'You do not have access to this resource.') {
    return new ApiError(403, message)
  }

  static notFound(message = 'Resource not found.') {
    return new ApiError(404, message)
  }

  static conflict(message) {
    return new ApiError(409, message)
  }

  static internal(message = 'Something went wrong. Please try again.') {
    return new ApiError(500, message)
  }
}
