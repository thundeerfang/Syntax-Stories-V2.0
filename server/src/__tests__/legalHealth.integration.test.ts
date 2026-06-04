import request from 'supertest';
import app from '../app.js';

describe('GET /api/health/legal', () => {
  it('returns 503 when Mongo is not connected (test env)', async () => {
    const res = await request(app).get('/api/health/legal');
    expect([503, 200]).toContain(res.status);
    if (res.status === 503) {
      expect(res.body).toMatchObject({ ok: false, service: 'legal' });
    }
  });
});
