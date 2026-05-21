import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResidentDashboardPage from '../pages/ResidentDashboardPage';
import { supabase } from '../supabaseClient';

jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

let mockProfile;
let mockRequests;

function createQueryBuilder(table) {
  return {
    select: jest.fn(function () {
      return this;
    }),

    eq: jest.fn(function () {
      return this;
    }),

    single: jest.fn(function () {
      return Promise.resolve({
        data: mockProfile,
        error: null,
      });
    }),

    order: jest.fn(function () {
      return Promise.resolve({
        data: mockRequests,
        error: null,
      });
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  mockProfile = {
    full_name: 'Resident User',
  };

  mockRequests = [
    {
      id: 1,
      category: 'pothole',
      status: 'Pending',
      location: 'Main Road',
      ward: '12',
      created_at: '2026-05-10',
    },
    {
      id: 2,
      category: 'burst-pipe',
      status: 'Resolved',
      location: 'Second Street',
      ward: '12',
      created_at: '2026-05-09',
    },
    {
      id: 3,
      category: 'power-outage',
      status: 'In Progress',
      location: '',
      ward: '',
      created_at: '2026-05-08',
    },
    {
      id: 4,
      category: 'unknown-category',
      status: null,
      location: null,
      ward: '',
      created_at: '2026-05-07',
    },
  ];

  supabase.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'user-1',
        email: 'resident@test.com',
      },
    },
  });

  supabase.from.mockImplementation((table) => createQueryBuilder(table));
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ResidentDashboardPage />
    </MemoryRouter>
  );
}

test('shows loading state initially', () => {
  renderPage();

  expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
});

test('loads dashboard with profile name, stats, ward, and recent requests', async () => {
  renderPage();

  expect(await screen.findByText(/resident dashboard/i)).toBeInTheDocument();

  expect(screen.getByText(/welcome back, resident user/i)).toBeInTheDocument();
  expect(screen.getAllByText(/ward 12/i).length).toBeGreaterThan(0);

  expect(screen.getByText(/your activity/i)).toBeInTheDocument();
  expect(screen.getByText(/your recent requests/i)).toBeInTheDocument();

  expect(screen.getByText(/pothole/i)).toBeInTheDocument();
  expect(screen.getByText(/burst-pipe/i)).toBeInTheDocument();
  expect(screen.getByText(/power-outage/i)).toBeInTheDocument();

  // 3 open, 1 resolved
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();
});

test('uses email prefix if profile has no full name', async () => {
  mockProfile = null;

  renderPage();

  expect(
    await screen.findByText(/welcome back, resident/i)
  ).toBeInTheDocument();
});

test('keeps default Resident name if no profile name and no email', async () => {
  supabase.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'user-1',
        email: '',
      },
    },
  });

  mockProfile = null;

  renderPage();

  expect(
    await screen.findByText(/welcome back, resident/i)
  ).toBeInTheDocument();
});

test('shows empty state when user has no requests', async () => {
  mockRequests = [];

  renderPage();

  expect(
    await screen.findByText(/no requests yet/i)
  ).toBeInTheDocument();

  expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText(/ward unknown/i)).toBeInTheDocument();
});

test('handles no logged in user', async () => {
  supabase.auth.getUser.mockResolvedValue({
    data: {
      user: null,
    },
  });

  renderPage();

  expect(await screen.findByText(/resident dashboard/i)).toBeInTheDocument();

  expect(screen.getByText(/welcome back, resident/i)).toBeInTheDocument();
  expect(screen.getByText(/ward unknown/i)).toBeInTheDocument();
  expect(screen.getByText(/no requests yet/i)).toBeInTheDocument();
});

test('limits recent requests to three items', async () => {
  renderPage();

  expect(await screen.findByText(/resident dashboard/i)).toBeInTheDocument();

  expect(screen.getByText(/pothole/i)).toBeInTheDocument();
  expect(screen.getByText(/burst-pipe/i)).toBeInTheDocument();
  expect(screen.getByText(/power-outage/i)).toBeInTheDocument();

  expect(screen.queryByText(/unknown-category/i)).not.toBeInTheDocument();
});

test('uses fallback category icon for unknown category', async () => {
  mockRequests = [
    {
      id: 1,
      category: 'other',
      status: 'Pending',
      location: 'Unknown place',
      ward: '5',
      created_at: '2026-05-10',
    },
  ];

  renderPage();

  expect(await screen.findByText(/📋 other/i)).toBeInTheDocument();
});


test('renders dashboard action links', async () => {
  renderPage();

  expect(await screen.findByText(/report new issue/i)).toBeInTheDocument();
  expect(screen.getByText(/view my requests/i)).toBeInTheDocument();
});

test('back button navigates home', async () => {
  renderPage();

  const backButton = await screen.findByText(/back to home/i);

  fireEvent.click(backButton);

  expect(mockNavigate).toHaveBeenCalledWith('/');
});