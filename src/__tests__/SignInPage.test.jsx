import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SignInPage from '../pages/SignInPage';
import { supabase } from '../supabaseClient';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('SignInPage', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders signin form', () => {
    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('successful admin login redirects correctly', async () => {

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: '1',
          email: 'admin@test.com',
        },
      },
      error: null,
    });

    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { role: 'admin' },
              error: null,
            }),
        }),
      }),
    });

    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'admin@test.com' },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  test('successful staff login redirects correctly', async () => {

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: '2',
          email: 'worker@test.com',
        },
      },
      error: null,
    });

    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { role: 'staff' },
              error: null,
            }),
        }),
      }),
    });

    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'worker@test.com' },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/worker/dashboard');
    });
  });

  test('default user redirects to resident dashboard', async () => {

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: '3',
          email: 'user@test.com',
        },
      },
      error: null,
    });

    supabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { role: 'user' },
              error: null,
            }),
        }),
      }),
    });

    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'user@test.com' },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/resident/dashboard');
    });
  });

  test('shows login error message', async () => {

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: {
        message: 'Invalid login credentials',
      },
    });

    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'bad@test.com' },
    });

    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
    });
  });

  test('google signin button works', async () => {

    supabase.auth.signInWithOAuth.mockResolvedValue({
      error: null,
    });

    render(
      <MemoryRouter>
        <SignInPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    
  });

});