import request from 'supertest';
import app from '../app';

describe('GET /api/health', () => {
  it('returns 200 and success payload', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: 'Server is running',
    });
    expect(typeof res.body.timestamp).toBe('string');
  });
});
