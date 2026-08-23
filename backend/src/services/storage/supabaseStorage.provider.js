import { createClient } from '@supabase/supabase-js'

const bucketName = process.env.SUPABASE_BUCKET || 'anora-documents'

// Lazily created — importing this file must never throw just because
// Supabase env vars aren't set, since STORAGE_PROVIDER=local (the
// default) never calls into it at all.
let supabase = null

function getClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set when STORAGE_PROVIDER=supabase')
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return supabase
}

export const supabaseStorageProvider = {
  async uploadFile(buffer, storageKey) {
    const { error } = await getClient()
      .storage.from(bucketName)
      .upload(storageKey, buffer, { upsert: true })

    if (error) throw new Error(`Supabase upload failed: ${error.message}`)

    return {
      storageKey,
      // Bucket is private — always stream through the backend's own
      // ownership-checked route rather than a raw Supabase URL, same
      // pattern as local storage.
      storageUrl: `/api/documents/file/${encodeURIComponent(storageKey)}`,
    }
  },

  async readFile(storageKey) {
    const { data, error } = await getClient().storage.from(bucketName).download(storageKey)
    if (error) throw new Error(`Supabase download failed: ${error.message}`)
    return Buffer.from(await data.arrayBuffer())
  },

  async deleteFile(storageKey) {
    const { error } = await getClient().storage.from(bucketName).remove([storageKey])
    if (error) throw new Error(`Supabase delete failed: ${error.message}`)
  },
}