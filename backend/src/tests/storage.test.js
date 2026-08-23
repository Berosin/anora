import { describe, it, expect, afterAll } from '@jest/globals'
import { localStorageProvider } from '../services/storage/localStorage.provider.js'

const testKey = `test-user-id/${Date.now()}-sample.txt`

describe('localStorageProvider', () => {
  it('writes a file and returns a resolvable storageUrl', async () => {
    const buffer = Buffer.from('ANORA storage provider test content')
    const result = await localStorageProvider.uploadFile(buffer, testKey)
    expect(result.storageKey).toBe(testKey)
    expect(result.storageUrl).toContain(encodeURIComponent(testKey))
  })

  it('reads back exactly what was written', async () => {
    const content = await localStorageProvider.readFile(testKey)
    expect(content.toString()).toBe('ANORA storage provider test content')
  })

  it('deletes the file, and a subsequent read fails', async () => {
    await localStorageProvider.deleteFile(testKey)
    await expect(localStorageProvider.readFile(testKey)).rejects.toThrow()
  })

  afterAll(async () => {
    // Belt-and-suspenders cleanup in case an assertion above failed early.
    await localStorageProvider.deleteFile(testKey).catch(() => {})
  })
})
