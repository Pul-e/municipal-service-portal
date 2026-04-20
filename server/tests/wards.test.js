const request = require('supertest');
const app = require('../index');

describe('Ward Lookup API', () => {
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn()
    };

    app.locals.supabase = mockSupabase;
  });

  test('Ward lookup returns 200 when ward is found', async () => {
    const selectMock = {
      filter: jest.fn().mockResolvedValue({
        data: [{ ward_number: '10', municipality: 'Joburg' }],
        error: null
      })
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => selectMock)
    });

    const res = await request(app).get('/api/wards?lat=-26.2&lng=28.0');

    expect(res.statusCode).toBe(200);
  });

  test('Ward lookup returns 404 when no ward found', async () => {
    const selectMock = {
      filter: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => selectMock)
    });

    const res = await request(app).get('/api/wards?lat=-26.2&lng=28.0');

    expect(res.statusCode).toBe(404);
  });

  test('Ward lookup returns 500 on DB error', async () => {
    const selectMock = {
      filter: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB error' }
      })
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn(() => selectMock)
    });

    const res = await request(app).get('/api/wards?lat=-26.2&lng=28.0');

    expect(res.statusCode).toBe(500);
  });
});
