import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import { supabase } from '../supabaseClient';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('AdminDashboardPage', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupSupabaseMocks() {

    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'admin1' },
      },
      error: null,
    });

    supabase.from.mockImplementation((table) => {

      if (table === 'service_requests') {
        return {
          select: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: 1,
                    category: 'Pothole',
                    location: 'Johannesburg',
                    status: 'Submitted',
                  },
                  {
                    id: 2,
                    category: 'Water Leak',
                    location: 'Soweto',
                    status: 'Resolved',
                  },
                ],
                error: null,
              }),
          }),
        };
      }

      if (table === 'profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'worker1',
                    full_name: 'John Worker',
                    email: 'worker@test.com',
                    role: 'staff',
                  },
                ],
                error: null,
              }),
          }),
        };
      }

      if (table === 'service_request_assignments') {
        return {
          select: () => ({
            order: () =>
              Promise.resolve({
                data: [],
                error: null,
              }),
          }),
          insert: jest.fn(() =>
            Promise.resolve({
              error: null,
            })
          ),
        };
      }

    });
  }

  test('renders loading state', () => {

    setupSupabaseMocks();

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/loading admin dashboard/i)
    ).toBeInTheDocument();
  });

  test('renders dashboard data correctly', async () => {

    setupSupabaseMocks();

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/pothole/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/water leak/i)).toBeInTheDocument();
    expect(screen.getByText(/john worker/i)).toBeInTheDocument();
  });

  test('filters resolved requests', async () => {

    setupSupabaseMocks();

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/water leak/i)).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole('button', { name: /resolved/i })
    );

    expect(screen.getByText(/water leak/i)).toBeInTheDocument();
  });

  test('view details button navigates correctly', async () => {

    setupSupabaseMocks();

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/view details/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText(/view details/i)[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/requests/1');
  });

  test('shows empty state when no requests exist', async () => {

    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'admin1' },
      },
      error: null,
    });

    supabase.from.mockImplementation((table) => {

      if (table === 'service_requests') {
        return {
          select: () => ({
            order: () =>
              Promise.resolve({
                data: [],
                error: null,
              }),
          }),
        };
      }

      if (table === 'profiles') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [],
                error: null,
              }),
          }),
        };
      }

      if (table === 'service_request_assignments') {
        return {
          select: () => ({
            order: () =>
              Promise.resolve({
                data: [],
                error: null,
              }),
          }),
        };
      }

    });

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/no requests found/i)
      ).toBeInTheDocument();
    });
  });

});