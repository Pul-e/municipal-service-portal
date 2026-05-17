import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase } from '../supabaseClient';

const mockNavigate = jest.fn();

jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function mockProfile(role = 'resident', fullName = 'Test User') {
  supabase.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: () =>
          Promise.resolve({
            data: {
              role,
              full_name: fullName,
            },
            error: null,
          }),
      }),
    }),
  });
}

function setupAuth(user = null, role = 'resident') {
  supabase.auth.getUser.mockResolvedValue({
    data: { user },
    error: null,
  });

  supabase.auth.onAuthStateChange.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: jest.fn(),
      },
    },
  });

  supabase.auth.signOut.mockResolvedValue({
    error: null,
  });

  mockProfile(role);
}

function renderNavbar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('shows sign in link when user is not logged in', async () => {
  setupAuth(null);

  renderNavbar('/');

  expect(
    await screen.findByText(/sign in/i)
  ).toBeInTheDocument();
});

test('renders resident navigation links', async () => {
  setupAuth(
    {
      id: 'user-1',
      email: 'resident@test.com',
    },
    'resident'
  );

  renderNavbar('/resident/dashboard');

  expect(
    await screen.findByText(/my requests/i)
  ).toBeInTheDocument();

  expect(screen.getByText(/report issue/i)).toBeInTheDocument();
  expect(screen.getByText(/resident/i)).toBeInTheDocument();
});

test('renders worker navigation links', async () => {
  setupAuth(
    {
      id: 'worker-1',
      email: 'worker@test.com',
    },
    'worker'
  );

  renderNavbar('/worker/dashboard');

  expect(
    await screen.findByText(/dashboard/i)
  ).toBeInTheDocument();

  expect(screen.getByText(/worker/i)).toBeInTheDocument();
});

test('renders admin navigation links', async () => {
  setupAuth(
    {
      id: 'admin-1',
      email: 'admin@test.com',
    },
    'admin'
  );

  renderNavbar('/admin/dashboard');

  expect(
    await screen.findByText(/users/i)
  ).toBeInTheDocument();

  expect(screen.getByText(/analytics/i)).toBeInTheDocument();
  expect(screen.getByText(/admin/i)).toBeInTheDocument();
});

test('sign out clears user and navigates home', async () => {
  setupAuth(
    {
      id: 'user-1',
      email: 'resident@test.com',
    },
    'resident'
  );

  renderNavbar('/resident/dashboard');

  const signOutButton = await screen.findByRole('button', {
    name: /sign out/i,
  });

  fireEvent.click(signOutButton);

  await waitFor(() => {
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});