import mongoose from 'mongoose'
import { env } from './env.js'
import { logger } from '../utils/logger.js'

mongoose.set('strictQuery', true)

export async function connectDatabase() {
  try {
    await mongoose.connect(env.mongoUri)
    logger.info(`MongoDB connected → ${mongoose.connection.name}`)
  } catch (error) {
    // We log and rethrow rather than exiting the process here, so the
    // caller (server.js) decides how to handle a failed DB connection —
    // e.g. still serving /health in local dev without Atlas configured.
    logger.error(`MongoDB connection failed: ${error.message}`)
    throw error
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect()
}
