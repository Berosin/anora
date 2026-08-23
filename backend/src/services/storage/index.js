import { localStorageProvider } from './localStorage.provider.js'
import { supabaseStorageProvider } from './supabaseStorage.provider.js'

const providers = {
  local: localStorageProvider,
  supabase: supabaseStorageProvider,
}

const providerName = process.env.STORAGE_PROVIDER || 'local'

if (!providers[providerName]) {
  throw new Error(`Unknown STORAGE_PROVIDER "${providerName}". Available: ${Object.keys(providers).join(', ')}`)
}

export const storageProvider = providers[providerName]