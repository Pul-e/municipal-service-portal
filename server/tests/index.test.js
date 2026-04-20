const request = require('supertest');
const app = require('../index');

describe('Server health endpoint', () => {
  test('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('Municipal Service Delivery API');
    expect(res.body).toHaveProperty('timestamp');
  });
});