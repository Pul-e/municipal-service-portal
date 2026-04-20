const request = require('supertest');
const app = require('../index');

describe('Requests routes', () => {
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn()
    };

    app.locals.supabase = mockSupabase;
  });

  test('POST /api/requests/enhanced returns 400 when latitude and longitude are missing', async () => {
    const res = await request(app)
      .post('/api/requests/enhanced')
      .send({
        category: 'Potholes',
        description: 'Large pothole in road',
        user_id: 'user-123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Location coordinates are required'
    });
  });

  test('POST /api/requests/enhanced creates request with ward and municipality', async () => {
    const wardSelectMock = {
      filter: jest.fn().mockResolvedValue({
        data: [{ ward_number: '12', municipality: 'Johannesburg' }],
        error: null
      })
    };

    const insertSingleMock = {
      single: jest.fn().mockResolvedValue({
        data: {
          id: 1,
          category: 'Water',
          description: 'Burst pipe',
          location: 'Johannesburg, Ward 12',
          location_point: 'POINT(28.0473 -26.2041)',
          ward: '12',
          status: 'Acknowledged',
          priority: 'Medium',
          user_id: 'user-123',
          assigned: false
        },
        error: null
      })
    };

    const insertSelectMock = {
      select: jest.fn(() => insertSingleMock)
    };

    mockSupabase.from
      .mockImplementationOnce(() => ({
        select: jest.fn(() => wardSelectMock)
      }))
      .mockImplementationOnce(() => ({
        insert: jest.fn(() => insertSelectMock)
      }));

    const res = await request(app)
      .post('/api/requests/enhanced')
      .send({
        category: 'Water',
        description: 'Burst pipe',
        latitude: -26.2041,
        longitude: 28.0473,
        user_id: 'user-123'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.category).toBe('Water');
    expect(res.body.ward).toBe('12');
    expect(res.body.municipality).toBe('Johannesburg');
    expect(res.body.auto_tagged_ward).toBe('12');
    expect(res.body.data_source).toBe('Municipal Demarcation Board (MDB) 2024');
  });

  test('POST /api/requests/enhanced uses Unknown when no ward is found', async () => {
    const wardSelectMock = {
      filter: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    };

    const insertSingleMock = {
      single: jest.fn().mockResolvedValue({
        data: {
          id: 2,
          category: 'Electricity',
          description: 'Power outage',
          location: 'Unknown, Ward Unknown',
          location_point: 'POINT(28.1 -26.1)',
          ward: 'Unknown',
          status: 'Acknowledged',
          priority: 'Medium',
          user_id: 'user-456',
          assigned: false
        },
        error: null
      })
    };

    const insertSelectMock = {
      select: jest.fn(() => insertSingleMock)
    };

    mockSupabase.from
      .mockImplementationOnce(() => ({
        select: jest.fn(() => wardSelectMock)
      }))
      .mockImplementationOnce(() => ({
        insert: jest.fn(() => insertSelectMock)
      }));

    const res = await request(app)
      .post('/api/requests/enhanced')
      .send({
        category: 'Electricity',
        description: 'Power outage',
        latitude: -26.1,
        longitude: 28.1,
        user_id: 'user-456'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ward).toBe('Unknown');
    expect(res.body.municipality).toBe('Unknown');
    expect(res.body.auto_tagged_ward).toBe('Unknown');
  });

  test('POST /api/requests/enhanced returns 500 when ward lookup fails badly', async () => {
    mockSupabase.from.mockImplementationOnce(() => ({
      select: jest.fn(() => ({
        filter: jest.fn().mockRejectedValue(new Error('Ward query failed'))
      }))
    }));

    const res = await request(app)
      .post('/api/requests/enhanced')
      .send({
        category: 'Waste',
        description: 'Illegal dumping',
        latitude: -26.2,
        longitude: 28.0,
        user_id: 'user-789'
      });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to create request' });
  });

  test('POST /api/requests/enhanced returns 500 when insert fails', async () => {
    const wardSelectMock = {
      filter: jest.fn().mockResolvedValue({
        data: [{ ward_number: '5', municipality: 'Tshwane' }],
        error: null
      })
    };

    const insertSingleMock = {
      single: jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Insert failed')
      })
    };

    const insertSelectMock = {
      select: jest.fn(() => insertSingleMock)
    };

    mockSupabase.from
      .mockImplementationOnce(() => ({
        select: jest.fn(() => wardSelectMock)
      }))
      .mockImplementationOnce(() => ({
        insert: jest.fn(() => insertSelectMock)
      }));

    const res = await request(app)
      .post('/api/requests/enhanced')
      .send({
        category: 'Roads',
        description: 'Road damage',
        latitude: -25.7,
        longitude: 28.2,
        user_id: 'user-999'
      });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to create request' });
  });
});