import dotenv from 'dotenv'

dotenv.config()

function required(name, fallback) {
  const value = process.env[name] ?? fallback
  if (value === undefined) {
    // Fail loudly at boot rather than deep inside a request handler.
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,

  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/anora'),

  jwtSecret: required('JWT_SECRET', 'dev-only-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',

  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB) || 20,
}

export const isProduction = env.nodeEnv === 'production'
