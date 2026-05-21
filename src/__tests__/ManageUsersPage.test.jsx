import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ManageUsersPage from '../pages/admin/ManageUsersPage';
import { supabase } from '../supabaseClient';

jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

let mockUsers = [];

function createQueryBuilder() {
  return {
    select: jest.fn(function () {
      return this;
    }),

    order: jest.fn(function () {
      return Promise.resolve({
        data: mockUsers,
        error: null,
      });
    }),

    update: jest.fn(function () {
      return this;
    }),

    eq: jest.fn(function () {
      return Promise.resolve({
        error: null,
      });
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  jest.useFakeTimers();

  mockUsers = [
    {
      id: '1',
      email: 'resident@test.com',
      full_name: 'Resident User',
      role: 'resident',
      created_at: '2026-05-10',
    },
    {
      id: '2',
      email: 'worker@test.com',
      full_name: 'Worker User',
      role: 'staff',
      created_at: '2026-05-10',
    },
    {
      id: '3',
      email: 'admin@test.com',
      full_name: 'Admin User',
      role: 'admin',
      created_at: '2026-05-10',
    },
  ];

  supabase.auth.getSession.mockResolvedValue({
    data: {
      session: {
        user: {
          id: 'admin-1',
        },
      },
    },
  });

  supabase.from.mockImplementation(() =>
    createQueryBuilder()
  );
});

afterEach(() => {
  jest.useRealTimers();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ManageUsersPage />
    </MemoryRouter>
  );
}

async function finishLoading() {
  jest.advanceTimersByTime(150);

  await waitFor(() => {
    expect(
      screen.queryByText(/loading users/i)
    ).not.toBeInTheDocument();
  });
}

test('shows loading state initially', () => {
  renderPage();

  expect(
    screen.getByText(/loading users/i)
  ).toBeInTheDocument();
});

test('loads and displays users', async () => {
  renderPage();

  await finishLoading();

  expect(
    screen.getByText(/manage users/i)
  ).toBeInTheDocument();

  expect(
    screen.getByText(/resident@test.com/i)
  ).toBeInTheDocument();

  expect(
    screen.getByText(/worker@test.com/i)
  ).toBeInTheDocument();

  expect(
    screen.getByText(/admin@test.com/i)
  ).toBeInTheDocument();
});

test('shows statistics cards', async () => {
  renderPage();

  await finishLoading();

  expect(screen.getByText(/total users/i)).toBeInTheDocument();
  expect(screen.getAllByText(/residents/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/workers/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/admins/i)).toBeInTheDocument();
});



test('filters workers correctly', async () => {
  renderPage();

  await finishLoading();

  const workersTab = screen.getByRole('tab', {
    name: /workers/i,
  });

  fireEvent.click(workersTab);

  expect(
    screen.getByText(/worker@test.com/i)
  ).toBeInTheDocument();
});

test('changes user role successfully', async () => {
  renderPage();

  await finishLoading();

  const selects = screen.getAllByRole('combobox');

  fireEvent.change(selects[0], {
    target: {
      value: 'staff',
    },
  });

  await waitFor(() => {
    expect(
      screen.getByText(/user role updated/i)
    ).toBeInTheDocument();
  });
});

test('shows protected admin label', async () => {
  renderPage();

  await finishLoading();

  expect(
    screen.getByText(/protected/i)
  ).toBeInTheDocument();
});

test('shows no users state', async () => {
  mockUsers = [];

  renderPage();

  await finishLoading();

  expect(
    screen.getByText(/no users found/i)
  ).toBeInTheDocument();
});

test('shows auth error if no session', async () => {
  supabase.auth.getSession.mockResolvedValue({
    data: {
      session: null,
    },
  });

  renderPage();

  await finishLoading();

  expect(
    screen.getByText(/please sign in as admin/i)
  ).toBeInTheDocument();
});

test('shows fetch error message', async () => {
  supabase.from.mockImplementation(() => ({
    select: jest.fn(function () {
      return this;
    }),

    order: jest.fn(function () {
      return Promise.resolve({
        data: null,
        error: {
          message: 'Database failed',
        },
      });
    }),
  }));

  renderPage();

  await finishLoading();

  expect(
    screen.getByText(/failed to load users/i)
  ).toBeInTheDocument();
});

test('refresh button reloads users', async () => {
  renderPage();

  await finishLoading();

  const refreshButton = screen.getByText(/refresh users/i);

  fireEvent.click(refreshButton);

  expect(supabase.from).toHaveBeenCalled();
});

test('back button navigates correctly', async () => {
  renderPage();

  await finishLoading();

  const backButton = screen.getByText(/back to admin dashboard/i);

  fireEvent.click(backButton);

  expect(mockNavigate).toHaveBeenCalledWith(
    '/admin/dashboard'
  );
});