import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`))
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let error = err

  // Translate common non-ApiError failures into safe, user-facing messages.
  if (err.name === 'ValidationError') {
    error = ApiError.badRequest('Some fields are invalid.', formatMongooseValidation(err))
  } else if (err.code === 11000) {
    error = ApiError.conflict('That value is already in use.')
  } else if (!(err instanceof ApiError)) {
    error = ApiError.internal()
  }

  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${err.message}`)
  } else {
    logger.warn(`${req.method} ${req.originalUrl} → ${error.statusCode} ${error.message}`)
  }

  // Stack traces stay in the server log above — never sent to the client,
  // in any environment.
  res.status(error.statusCode).json({
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
  })
}

function formatMongooseValidation(err) {
  return Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
}
