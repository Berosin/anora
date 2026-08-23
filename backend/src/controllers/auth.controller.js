import { User } from '../models/User.js'
import { Usage } from '../models/Usage.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { signToken } from '../utils/token.js'
import { logger } from '../utils/logger.js'

function toAuthResponse(user) {
  return {
    token: signToken(user._id.toString()),
    user: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt },
  }
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    throw ApiError.conflict('An account with that email already exists.')
  }

  const user = new User({ name, email })
  user.password = password // virtual — hashed by the pre-save hook, never stored raw
  await user.save()

  // Every user gets a Usage document up front so dashboard queries never
  // have to special-case "no usage record yet."
  await Usage.create({ userId: user._id })

  logger.info(`New user registered: ${user._id}`)
  res.status(201).json(toAuthResponse(user))
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')
  const passwordMatches = user ? await user.comparePassword(password) : false

  if (!user || !passwordMatches) {
    // Deliberately identical message for "no such user" and "wrong
    // password" — don't let the response reveal whether an email is registered.
    throw ApiError.unauthorized('Invalid email or password.')
  }

  await Usage.updateOne({ userId: user._id }, { lastActiveAt: new Date() }, { upsert: true })

  res.json(toAuthResponse(user))
})

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user })
})
