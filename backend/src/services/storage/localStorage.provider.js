import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_ROOT = path.join(__dirname, '../../../uploads')

if (!fsSync.existsSync(UPLOAD_ROOT)) {
  fsSync.mkdirSync(UPLOAD_ROOT, { recursive: true })
}

/**
 * Local-disk implementation of the StorageProvider interface.
 *
 * NOTE: free hosts like Render/Railway have ephemeral disks — files
 * written here vanish on redeploy/restart. This provider is intended for
 * local development only. In production, swap `STORAGE_PROVIDER` to a
 * persistent provider (Cloudinary/Supabase Storage) that implements the
 * same three methods, per the Phase 0 free-tier strategy.
 */
export const localStorageProvider = {
  /**
   * @param {Buffer} buffer
   * @param {string} storageKey - e.g. "userId/documentId-filename.pdf"
   * @returns {Promise<{ storageKey: string, storageUrl: string }>}
   */
  async uploadFile(buffer, storageKey) {
    const destination = path.join(UPLOAD_ROOT, storageKey)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    await fs.writeFile(destination, buffer)
    return {
      storageKey,
      // Not a public URL — the backend streams this file back through an
      // ownership-checked route (`GET /api/documents/:id/file`), since
      // local storage has no concept of a signed/public URL of its own.
      storageUrl: `/api/documents/file/${encodeURIComponent(storageKey)}`,
    }
  },

  async readFile(storageKey) {
    const filePath = path.join(UPLOAD_ROOT, storageKey)
    return fs.readFile(filePath)
  },

  async deleteFile(storageKey) {
    const filePath = path.join(UPLOAD_ROOT, storageKey)
    await fs.rm(filePath, { force: true })
  },
}
