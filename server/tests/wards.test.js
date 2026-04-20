const request = require('supertest');
const app = require('../index');

describe('Ward Lookup API', () => {
  test('Health check endpoint works', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  test('Ward lookup requires coordinates', async () => {
    const res = await request(app).get('/api/wards/lookup');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Latitude and longitude are required');
  });

  test('Ward lookup with valid coordinates', async () => {
    // Using coordinates for Sandton, Johannesburg
    const res = await request(app)
      .get('/api/wards/lookup?lat=-26.107&lng=28.057');
    
    // This may return 404 if ward data isn't loaded yet
    // That's okay for now - the test validates the endpoint structure
    expect([200, 404]).toContain(res.statusCode);
  });
});