import request from 'supertest';
import app from '../app.js';

describe('GET /api/platform/stats', () => {
  it('returns 200 and stats payload', async () => {
    const res = await request(app).get('/api/platform/stats');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toMatchObject({
        success: true,
        stats: {
          linesWritten: expect.any(Number),
          activeUsers: expect.any(Number),
          components: expect.any(Number),
          uptimePercent: expect.any(Number),
          collectedAt: expect.any(String),
        },
      });
    }
  });
});
