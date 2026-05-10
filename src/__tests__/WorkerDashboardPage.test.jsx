import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WorkerDashboardPage from '../pages/WorkerDashboardPage';
import { supabase } from '../supabaseClient';

jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

jest.mock('../components/StatusBadge', () => {
  return function MockStatusBadge({ status }) {
    return <span>{status}</span>;
  };
});

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

let mockDb;

function createQueryBuilder(table) {
  const builder = {
    table,
    operation: null,
    filters: {},
    payload: null,

    select: jest.fn(function (cols) {
      this.operation = 'select';
      this.cols = cols;
      return this;
    }),

    update: jest.fn(function (payload) {
      this.operation = 'update';
      this.payload = payload;
      return this;
    }),

    insert: jest.fn(function (payload) {
      this.operation = 'insert';
      this.payload = payload;
      return Promise.resolve({ data: payload, error: mockDb.insertError || null });
    }),

    eq: jest.fn(function (col, value) {
      this.filters[col] = value;
      return this;
    }),

    is: jest.fn(function (col, value) {
      this.filters[col] = value;
      return this;
    }),

    in: jest.fn(function (col, value) {
      this.filters[col] = value;
      return this;
    }),

    neq: jest.fn(function (col, value) {
      this.filters[`neq_${col}`] = value;
      return this;
    }),

    not: jest.fn(function (col, op, value) {
      this.filters[`not_${col}`] = value;
      return this;
    }),

    single: jest.fn(function () {
      if (table === 'profiles') {
        return Promise.resolve({
          data: mockDb.profile,
          error: mockDb.profileError || null,
        });
      }

      if (table === 'service_requests') {
        return Promise.resolve({
          data: mockDb.reporterRequest,
          error: mockDb.reporterRequestError || null,
        });
      }

      return Promise.resolve({ data: null, error: null });
    }),

    maybeSingle: jest.fn(function () {
      return Promise.resolve({
        data: mockDb.reporterProfile,
        error: mockDb.reporterProfileError || null,
      });
    }),

    then(resolve, reject) {
      return Promise.resolve(getMockResult(this)).then(resolve, reject);
    },
  };

  return builder;
}

function getMockResult(builder) {
  if (builder.operation === 'update') {
    mockDb.updates.push({
      table: builder.table,
      payload: builder.payload,
      filters: builder.filters,
    });

    return { data: null, error: mockDb.updateError || null };
  }

  if (builder.table === 'service_request_assignments') {
    if (builder.cols === 'request_id, assigned_at, assigned_by') {
      return {
        data: mockDb.assignments,
        error: mockDb.assignmentsError || null,
      };
    }

    if (builder.cols === 'request_id') {
      return {
        data: mockDb.assignedIds,
        error: mockDb.assignedIdsError || null,
      };
    }
  }

  if (builder.table === 'service_requests') {
    if (builder.filters.id && Array.isArray(builder.filters.id)) {
      return {
        data: mockDb.assignedRequests,
        error: mockDb.requestsError || null,
      };
    }

    return {
      data: mockDb.unassignedRequests,
      error: mockDb.requestsError || null,
    };
  }

  return { data: [], error: null };
}

function setupMockDb(overrides = {}) {
  mockDb = {
    profile: {
      id: 'worker-1',
      full_name: 'Test Worker',
      role: 'worker',
      zone: 'A',
    },

    assignments: [
      {
        request_id: 1,
        assigned_at: '2026-05-10',
        assigned_by: 'admin-1',
      },
    ],

    assignedIds: [{ request_id: 1 }],

    assignedRequests: [
      {
        id: 1,
        category: 'Water',
        description: 'Burst pipe outside house',
        address: '10 Main Road',
        location: 'Ward 1',
        status: 'Assigned',
        priority: 'High',
      },
    ],

    unassignedRequests: [
      {
        id: 2,
        category: 'Roads',
        description: 'Large pothole',
        address: '5 Street Road',
        location: 'Ward 2',
        status: 'Submitted',
        priority: 'Medium',
      },
      {
        id: 3,
        category: 'Waste',
        description: 'Illegal dumping',
        address: 'Dumping site',
        location: 'Ward 3',
        status: 'Acknowledged',
        priority: 'Low',
      },
      {
        id: 4,
        category: 'Electricity',
        description: 'Street light broken',
        address: 'Pole 15',
        location: 'Ward 4',
        status: 'In Progress',
        priority: 'High',
      },
    ],

    reporterRequest: {
      id: 1,
      user_id: 'resident-1',
      category: 'Water',
      location: 'Ward 1',
      address: '10 Main Road',
      status: 'Assigned',
    },

    reporterProfile: {
      id: 'resident-1',
      email: 'resident@test.com',
      full_name: 'Resident User',
    },

    updates: [],

    ...overrides,
  };

  supabase.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'worker-1',
        email: 'worker@test.com',
      },
    },
    error: null,
  });

  supabase.from.mockImplementation((table) => createQueryBuilder(table));

  supabase.functions.invoke.mockResolvedValue({
    data: null,
    error: null,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkerDashboardPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  setupMockDb();
});

test('shows loading state first', () => {
  renderPage();

  expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
});

test('loads and displays worker dashboard data', async () => {
  renderPage();

  expect(await screen.findByText(/municipal worker dashboard/i)).toBeInTheDocument();

  expect(screen.getByText(/test worker/i)).toBeInTheDocument();
  expect(screen.getByText(/water/i)).toBeInTheDocument();
  expect(screen.getByText(/roads/i)).toBeInTheDocument();
  expect(screen.getByText(/waste/i)).toBeInTheDocument();
  expect(screen.getByText(/electricity/i)).toBeInTheDocument();

  expect(screen.getByText(/claim request/i)).toBeInTheDocument();
  expect(screen.getByText(/start progress/i)).toBeInTheDocument();
  expect(screen.getByText(/mark resolved/i)).toBeInTheDocument();
});

test('shows empty states when there are no requests', async () => {
  setupMockDb({
    assignments: [],
    assignedIds: [],
    assignedRequests: [],
    unassignedRequests: [],
  });

  renderPage();

  expect(await screen.findByText(/no requests assigned to you/i)).toBeInTheDocument();
  expect(screen.getByText(/no new unassigned requests/i)).toBeInTheDocument();
  expect(screen.getByText(/no acknowledged unassigned requests/i)).toBeInTheDocument();
  expect(screen.getByText(/no in-progress unassigned requests/i)).toBeInTheDocument();
});

test('claims an unassigned request', async () => {
  renderPage();

  const claimButton = await screen.findByText(/claim request/i);
  fireEvent.click(claimButton);

  await waitFor(() => {
    expect(mockDb.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'service_requests',
          payload: expect.objectContaining({
            status: 'Assigned',
            assigned: true,
          }),
        }),
      ])
    );
  });
});

test('updates assigned request to In Progress', async () => {
  renderPage();

  const startButton = await screen.findByText(/start progress/i);
  fireEvent.click(startButton);

  await waitFor(() => {
    expect(mockDb.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'service_requests',
          payload: expect.objectContaining({
            status: 'In Progress',
            assigned: true,
          }),
        }),
      ])
    );
  });

  expect(supabase.functions.invoke).toHaveBeenCalledWith(
    'send-status-email',
    expect.objectContaining({
      body: expect.objectContaining({
        to: 'resident@test.com',
        status: 'In Progress',
      }),
    })
  );
});

test('marks an in-progress request as resolved', async () => {
  renderPage();

  const resolvedButtons = await screen.findAllByText(/mark resolved/i);
  fireEvent.click(resolvedButtons[0]);

  await waitFor(() => {
    expect(mockDb.updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'service_request_assignments',
          payload: expect.objectContaining({
            unassigned_at: expect.any(String),
          }),
        }),
        expect.objectContaining({
          table: 'service_requests',
          payload: expect.objectContaining({
            status: 'Resolved',
            resolved_at: expect.any(String),
          }),
        }),
      ])
    );
  });

  expect(supabase.functions.invoke).toHaveBeenCalled();
});

test('shows error when dashboard fails to load', async () => {
  supabase.auth.getUser.mockResolvedValue({
    data: null,
    error: new Error('Auth failed'),
  });

  renderPage();

  expect(await screen.findByText(/failed to load dashboard data/i)).toBeInTheDocument();
});

test('shows error when claim fails', async () => {
  setupMockDb({
    insertError: new Error('Insert failed'),
  });

  renderPage();

  const claimButton = await screen.findByText(/claim request/i);
  fireEvent.click(claimButton);

  expect(await screen.findByText(/failed to claim request/i)).toBeInTheDocument();
});

test('back button navigates home', async () => {
  renderPage();

  const backButton = await screen.findByText(/back to home/i);
  fireEvent.click(backButton);

  expect(mockNavigate).toHaveBeenCalledWith('/');
});