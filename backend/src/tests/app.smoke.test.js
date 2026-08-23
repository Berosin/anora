import { describe, it, expect } from '@jest/globals'
import request from 'supertest'
import { createApp } from '../app.js'

const app = createApp()

describe('GET /health', () => {
  it('responds 200 without needing a database connection', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

describe('unknown routes', () => {
  it('responds 404 with a clean JSON error, no stack trace', async () => {
    const res = await request(app).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body.message).toMatch(/No route/)
    expect(res.body.debugStack).toBeUndefined()
  })
})

describe('POST /api/auth/register validation', () => {
  it('rejects a short password before touching the database', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: '123' })
    expect(res.status).toBe(400)
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'password' }),
      ])
    )
  })
})

describe('protected routes', () => {
  it('rejects requests with no Authorization header', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('rejects requests with a malformed token before any DB lookup', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-jwt')
    expect(res.status).toBe(401)
  })
})

describe('ai feature routes', () => {
  it('rejects unauthenticated summarize/compare requests', async () => {
    const summarize = await request(app).post('/api/ai/summarize').send({ documentId: 'x' })
    const compare = await request(app)
      .post('/api/ai/compare')
      .send({ documentIdA: 'x', documentIdB: 'y' })
    expect(summarize.status).toBe(401)
    expect(compare.status).toBe(401)
  })
})

describe('document routes', () => {
  it('rejects unauthenticated upload attempts', async () => {
    const res = await request(app).post('/api/documents/upload')
    expect(res.status).toBe(401)
  })

  it('rejects unauthenticated listing/detail/delete', async () => {
    const list = await request(app).get('/api/documents')
    const detail = await request(app).get('/api/documents/507f1f77bcf86cd799439011')
    const del = await request(app).delete('/api/documents/507f1f77bcf86cd799439011')
    expect(list.status).toBe(401)
    expect(detail.status).toBe(401)
    expect(del.status).toBe(401)
  })
})

describe('chat routes', () => {
  it('rejects unauthenticated chat messages', async () => {
    const res = await request(app).post('/api/chat').send({ kbId: 'x', question: 'test' })
    expect(res.status).toBe(401)
  })

  it('rejects unauthenticated conversation listing/detail/delete', async () => {
    const list = await request(app).get('/api/chat/conversations')
    const detail = await request(app).get('/api/chat/conversations/507f1f77bcf86cd799439011')
    const del = await request(app).delete('/api/chat/conversations/507f1f77bcf86cd799439011')
    expect(list.status).toBe(401)
    expect(detail.status).toBe(401)
    expect(del.status).toBe(401)
  })
})
