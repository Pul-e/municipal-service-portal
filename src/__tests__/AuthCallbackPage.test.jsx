import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AuthCallbackPage from '../pages/AuthCallbackPage';

// Mock supabase
jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import { supabase } from '../supabaseClient';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('displays processing status on mount', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      renderWithRouter(<AuthCallbackPage />);

      expect(screen.getByText(/Processing your sign in/i)).toBeInTheDocument();
      expect(screen.getByText(/Please wait while we complete your sign in/i)).toBeInTheDocument();
    });

    test('displays loading spinner', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      renderWithRouter(<AuthCallbackPage />);

      expect(screen.getByText('🔄')).toBeInTheDocument();
    });
  });

  describe('Session Error Handling', () => {
    test('displays error when getSession fails', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session retrieval failed' },
      });

      renderWithRouter(<AuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/Sign In Failed/i)).toBeInTheDocument();
        expect(screen.getByText(/Session retrieval failed/i)).toBeInTheDocument();
      });
    });

    test('displays error when no session found', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      renderWithRouter(<AuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/Sign In Failed/i)).toBeInTheDocument();
        expect(screen.getByText(/No session found/i)).toBeInTheDocument();
      });
    });

    test('renders back to sign in button on error', async () => {
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Auth failed' },
      });

      renderWithRouter(<AuthCallbackPage />);

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /Back to Sign In/i });
        expect(backButton).toBeInTheDocument();
      });
    });

   
  });

  describe('Existing Profile - Resident User', () => {
    test('navigates to resident dashboard for user role', async () => {
      jest.useFakeTimers();
      
      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              email: 'user@example.com',
              user_metadata: { full_name: 'Test User' },
            },
          },
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'user' },
              error: null,
            }),
          }),
        }),
      });

      renderWithRouter(<AuthCallbackPage />);

      jest.runAllTimers();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/resident/dashboard');
      });

      jest.useRealTimers();
    });
  });

  describe('Existing Profile - Staff User', () => {
    test('navigates to worker dashboard for staff role', async () => {
      jest.useFakeTimers();
      
      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'staff-123',
              email: 'staff@example.com',
              user_metadata: { full_name: 'Staff User' },
            },
          },
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'staff' },
              error: null,
            }),
          }),
        }),
      });

      renderWithRouter(<AuthCallbackPage />);

      jest.runAllTimers();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/worker/dashboard');
      });

      jest.useRealTimers();
    });
  });

  describe('Existing Profile - Admin User', () => {
    test('navigates to admin dashboard for admin role', async () => {
      jest.useFakeTimers();
      
      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'admin-123',
              email: 'admin@example.com',
              user_metadata: { full_name: 'Admin User' },
            },
          },
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'admin' },
              error: null,
            }),
          }),
        }),
      });

      renderWithRouter(<AuthCallbackPage />);

      jest.runAllTimers();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
      });

      jest.useRealTimers();
    });
  });

  describe('New Profile Creation', () => {
    test('creates new profile with default user role', async () => {
      jest.useFakeTimers();
      
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'new-user-123' },
        error: null,
      });

      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'new-user-123',
              email: 'newuser@example.com',
              user_metadata: { full_name: 'New User' },
            },
          },
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
        insert: mockInsert,
      });

      renderWithRouter(<AuthCallbackPage />);

      jest.runAllTimers();

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          id: 'new-user-123',
          email: 'newuser@example.com',
          full_name: 'New User',
          role: 'user',
        });
      });

      jest.useRealTimers();
    });

    test('uses email as full_name if user_metadata not provided', async () => {
      jest.useFakeTimers();
      
      const mockInsert = jest.fn().mockResolvedValue({
        data: { id: 'new-user-456' },
        error: null,
      });

      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'new-user-456',
              email: 'noname@example.com',
              user_metadata: {},
            },
          },
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
        insert: mockInsert,
      });

      renderWithRouter(<AuthCallbackPage />);

      jest.runAllTimers();

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            full_name: 'noname@example.com',
          })
        );
      });

      jest.useRealTimers();
    });

    test('navigates to resident dashboard after profile creation', async () => {
      jest.useFakeTimers();
      
      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'new-user-789',
              email: 'another@example.com',
              user_metadata: { full_name: 'Another User' },
            },
          },
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'new-user-789' },
          error: null,
        }),
      });

      renderWithRouter(<AuthCallbackPage />);

      jest.runAllTimers();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/resident/dashboard');
      });

      jest.useRealTimers();
    });

    test('handles profile insertion error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'new-user-error',
              email: 'error@example.com',
              user_metadata: { full_name: 'Error User' },
            },
          },
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      });

      renderWithRouter(<AuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/Sign In Failed/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to create your account profile/i)).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error creating profile:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Profile Fetch Error Handling', () => {
    test('handles non-PGRST116 profile fetch error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-error',
              email: 'error@example.com',
              user_metadata: { full_name: 'Error User' },
            },
          },
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'OTHER_ERROR', message: 'Database error' },
            }),
          }),
        }),
      });

      renderWithRouter(<AuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/Sign In Failed/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to load your account information/i)).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching profile:',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Unexpected Error Handling', () => {
    test('handles unexpected errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      supabase.auth.getSession.mockRejectedValue(new Error('Unexpected error'));

      renderWithRouter(<AuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/Sign In Failed/i)).toBeInTheDocument();
        expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Unexpected error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Default Role Handling', () => {
    test('uses default user role when profile has no role', async () => {
      jest.useFakeTimers();
      
      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-no-role',
              email: 'norole@example.com',
              user_metadata: { full_name: 'No Role User' },
            },
          },
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: null },
              error: null,
            }),
          }),
        }),
      });

      renderWithRouter(<AuthCallbackPage />);

      jest.runAllTimers();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/resident/dashboard');
      });

      jest.useRealTimers();
    });

    test('uses default user role for unknown role value', async () => {
      jest.useFakeTimers();
      
      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-unknown-role',
              email: 'unknown@example.com',
              user_metadata: { full_name: 'Unknown Role User' },
            },
          },
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { role: 'superadmin' },
              error: null,
            }),
          }),
        }),
      });

      renderWithRouter(<AuthCallbackPage />);

      jest.runAllTimers();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/resident/dashboard');
      });

      jest.useRealTimers();
    });
  });
});