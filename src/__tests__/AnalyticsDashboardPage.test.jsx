import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsDashboardPage from '../pages/AnalyticsDashboardPage';
import { supabase } from '../supabaseClient';

jest.mock('../supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

let mockDb;

function createQueryBuilder(table) {
  const builder = {
    table,
    filters: {},

    select: jest.fn(function () {
      return this;
    }),

    eq: jest.fn(function (col, value) {
      this.filters[col] = value;
      return this;
    }),

    not: jest.fn(function (col, op, value) {
      this.filters[col] = value;
      return this;
    }),

    in: jest.fn(function (col, value) {
      this.filters[col] = value;
      return this;
    }),

    then(resolve, reject) {
      return Promise.resolve(getMockResult(this)).then(resolve, reject);
    },
  };

  return builder;
}

function getMockResult(builder) {
  if (builder.table === 'service_requests') {
    if (!builder.filters.status) {
      return {
        data: mockDb.requests,
        error: mockDb.requestsError || null,
      };
    }

    return {
      data: mockDb.resolvedRequests,
      error: mockDb.resolvedError || null,
    };
  }

  if (builder.table === 'service_request_assignments') {
    return {
      data: mockDb.assignments,
      error: mockDb.assignmentError || null,
    };
  }

  if (builder.table === 'profiles') {
    return {
      data: mockDb.profiles,
      error: mockDb.profileError || null,
    };
  }

  return { data: [], error: null };
}

function setupMockDb(overrides = {}) {
  mockDb = {
    requests: [
      {
        category: 'Water',
        status: 'Submitted',
        created_at: '2026-05-10T12:00:00',
      },
      {
        category: 'Roads',
        status: 'Resolved',
        created_at: '2026-05-11T12:00:00',
      },
      {
        category: 'Water',
        status: 'In Progress',
        created_at: '2026-05-11T12:00:00',
      },
    ],

    resolvedRequests: [
      {
        category: 'Roads',
        resolution_time_minutes: 120,
      },
      {
        category: 'Water',
        resolution_time_minutes: 60,
      },
    ],

    assignments: [
      {
        staff_id: 'worker-1',
        assigned_at: '2026-05-10',
        service_requests: {
          id: 1,
          status: 'Resolved',
          resolution_time_minutes: 60,
        },
      },
      {
        staff_id: 'worker-1',
        assigned_at: '2026-05-11',
        service_requests: {
          id: 2,
          status: 'Resolved',
          resolution_time_minutes: 120,
        },
      },
    ],

    profiles: [
      {
        id: 'worker-1',
        full_name: 'John Worker',
      },
    ],

    ...overrides,
  };

  supabase.from.mockImplementation((table) => createQueryBuilder(table));
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AnalyticsDashboardPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  setupMockDb();

  window.print = jest.fn();

  global.URL.createObjectURL = jest.fn(() => 'mock-url');
  global.URL.revokeObjectURL = jest.fn();
});

test('shows loading state initially', () => {
  renderPage();

  expect(screen.getByText(/loading reports/i)).toBeInTheDocument();
});

test('loads analytics dashboard successfully', async () => {
  renderPage();

  expect(
    await screen.findByText(/service delivery insights/i)
  ).toBeInTheDocument();

  expect(screen.getByText(/request volume analysis/i)).toBeInTheDocument();

  expect(screen.getByText(/total requests/i)).toBeInTheDocument();
});
test('switches to resolution tab', async () => {
  renderPage();

  const resolutionTab = await screen.findByRole('button', { name: /resolution times/i });
  fireEvent.click(resolutionTab);

  expect(await screen.findByText(/resolution time analysis/i)).toBeInTheDocument();
  expect(screen.getByText(/total resolved/i)).toBeInTheDocument();
  expect(screen.getByText(/avg resolution time/i)).toBeInTheDocument();
});

test('switches to worker performance tab', async () => {
  renderPage();

  const workerTab = await screen.findByRole('button', { name: /worker performance/i });
  fireEvent.click(workerTab);

  expect(await screen.findByRole('heading', { name: /worker performance/i })).toBeInTheDocument();
  expect(screen.getByText(/john worker/i)).toBeInTheDocument();
  expect(screen.getByText(/active workers/i)).toBeInTheDocument();
  expect(screen.getByText(/total resolved/i)).toBeInTheDocument();
});

test('exports csv successfully', async () => {
  const originalCreateElement = document.createElement.bind(document);
  const mockClick = jest.fn();

  jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
    if (tagName === 'a') {
      const anchor = originalCreateElement('a');
      anchor.click = mockClick;
      return anchor;
    }

    return originalCreateElement(tagName);
  });

  renderPage();

  const exportButton = await screen.findByRole('button', { name: /export csv/i });
  fireEvent.click(exportButton);

  expect(global.URL.createObjectURL).toHaveBeenCalled();
  expect(mockClick).toHaveBeenCalled();

  document.createElement.mockRestore();
});

test('exports pdf successfully', async () => {
  renderPage();

  const exportButton = await screen.findByRole('button', { name: /export pdf/i });
  fireEvent.click(exportButton);

  expect(window.print).toHaveBeenCalled();
});

test('refresh reports button works', async () => {
  renderPage();

  const refreshButton = await screen.findByRole('button', { name: /refresh reports/i });
  fireEvent.click(refreshButton);

  expect(await screen.findByText(/request volume analysis/i)).toBeInTheDocument();
  expect(supabase.from).toHaveBeenCalled();
});

test('shows worker empty state', async () => {
  setupMockDb({
    profiles: [],
    assignments: [],
  });

  renderPage();

  const workerTab = await screen.findByRole('button', { name: /worker performance/i });
  fireEvent.click(workerTab);

  expect(await screen.findByText(/no worker data available/i)).toBeInTheDocument();
});

test('shows analytics error message', async () => {
  setupMockDb({
    requestsError: new Error('Database failed'),
  });

  renderPage();

  expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load analytics/i);
});

test('back button navigates correctly', async () => {
  renderPage();

  const backButton = await screen.findByRole('button', { name: /back to admin dashboard/i });
  fireEvent.click(backButton);

  expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
});