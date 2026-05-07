import request from 'supertest';
import app from '../app.js';

describe('GET /api/webhooks/operational/ping', () => {
  it('returns 200 and ok payload', async () => {
    const res = await request(app).get('/api/webhooks/operational/ping');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      service: 'syntax-stories-api',
    });
    expect(typeof res.body.t).toBe('string');
  });
});
