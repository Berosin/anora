import { validationResult } from 'express-validator'
import { ApiError } from '../utils/ApiError.js'

export function validate(req, _res, next) {
  const result = validationResult(req)
  if (result.isEmpty()) return next()

  const details = result.array().map((e) => ({ field: e.path, message: e.msg }))
  next(ApiError.badRequest('Some fields are invalid.', details))
}
