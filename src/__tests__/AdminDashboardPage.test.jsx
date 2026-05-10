import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboardPage from '../pages/AdminDashboardPage';

// Mock supabase
jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
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

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  function setupDefaultMocks() {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-user-1' } },
      error: null,
    });

    const mockSelect = jest.fn();
    const mockOrder = jest.fn();
    const mockIn = jest.fn();
    const mockInsert = jest.fn();

    mockOrder.mockResolvedValue({
      data: [],
      error: null,
    });

    mockIn.mockResolvedValue({
      data: [],
      error: null,
    });

    mockSelect.mockImplementation((fields) => {
      if (fields.includes('request_id')) {
        // service_request_assignments
        return {
          order: mockOrder,
        };
      }
      // profiles or service_requests
      return {
        order: mockOrder,
        in: mockIn,
      };
    });

    mockInsert.mockResolvedValue({
      data: {},
      error: null,
    });

    supabase.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });
  }

  describe('Rendering', () => {
    test('renders loading text initially', () => {
      supabase.auth.getUser.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithRouter(<AdminDashboardPage />);
      expect(screen.getByText(/Loading admin dashboard/i)).toBeInTheDocument();
    });

    test('renders admin dashboard header', async () => {
      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Admin/i)).toBeInTheDocument();
        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      });
    });

    test('renders System Administrator label', async () => {
      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/System Administrator/i)).toBeInTheDocument();
      });
    });

    test('renders filter buttons', async () => {
      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /All Requests/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Open/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Resolved/i })).toBeInTheDocument();
      });
    });

  });

  describe('Data Loading', () => {

    test('displays staff count in stats', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields) => {
          if (fields.includes('role')) {
            return {
              in: jest.fn().mockResolvedValue({
                data: [
                  { id: 'staff-1', full_name: 'Worker 1', email: 'w1@example.com', role: 'staff' },
                  { id: 'staff-2', full_name: 'Worker 2', email: 'w2@example.com', role: 'worker' },
                  { id: 'staff-3', full_name: 'Worker 3', email: 'w3@example.com', role: 'staff' },
                ],
                error: null,
              }),
            };
          }
          return {
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }),
        insert: jest.fn(),
      });

      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        const staffCounts = screen.getAllByText('3');
        expect(staffCounts.length).toBeGreaterThan(0);
      });
    });

    test('calculates resolved percentage correctly', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields) => {
          if (fields.includes('request_id')) {
            return {
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          if (fields.includes('role')) {
            return {
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          return {
            order: jest.fn().mockResolvedValue({
              data: [
                { id: '1', status: 'Resolved', category: 'pothole', location: 'Street 1', created_at: new Date().toISOString() },
                { id: '2', status: 'Resolved', category: 'pothole', location: 'Street 2', created_at: new Date().toISOString() },
                { id: '3', status: 'Acknowledged', category: 'pothole', location: 'Street 3', created_at: new Date().toISOString() },
                { id: '4', status: 'Acknowledged', category: 'pothole', location: 'Street 4', created_at: new Date().toISOString() },
              ],
              error: null,
            }),
          };
        }),
        insert: jest.fn(),
      });

      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/50%/i)).toBeInTheDocument(); // 2 resolved out of 4
      });
    });
  });

  describe('Filtering', () => {
    test('filters by open requests', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields) => {
          if (fields.includes('request_id')) {
            return {
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          if (fields.includes('role')) {
            return {
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          return {
            order: jest.fn().mockResolvedValue({
              data: [
                { id: '1', status: 'Acknowledged', category: 'pothole', location: 'Main St', created_at: new Date().toISOString() },
                { id: '2', status: 'Resolved', category: 'water', location: 'Oak Ave', created_at: new Date().toISOString() },
              ],
              error: null,
            }),
          };
        }),
        insert: jest.fn(),
      });

      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/pothole/i)).toBeInTheDocument();
      });

      const openBtn = screen.getByRole('button', { name: /Open/i });
      await userEvent.click(openBtn);

      await waitFor(() => {
        expect(screen.getByText(/pothole/i)).toBeInTheDocument();
        expect(screen.queryByText(/water/i)).not.toBeInTheDocument();
      });
    });

    test('filters by resolved requests', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields) => {
          if (fields.includes('request_id')) {
            return {
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          if (fields.includes('role')) {
            return {
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          return {
            order: jest.fn().mockResolvedValue({
              data: [
                { id: '1', status: 'Acknowledged', category: 'pothole', location: 'Main St', created_at: new Date().toISOString() },
                { id: '2', status: 'Resolved', category: 'water', location: 'Oak Ave', created_at: new Date().toISOString() },
              ],
              error: null,
            }),
          };
        }),
        insert: jest.fn(),
      });

      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/pothole/i)).toBeInTheDocument();
      });

      const resolvedBtn = screen.getByRole('button', { name: /Resolved/i });
      await userEvent.click(resolvedBtn);

      await waitFor(() => {
        expect(screen.getByText(/water/i)).toBeInTheDocument();
        expect(screen.queryByText(/pothole/i)).not.toBeInTheDocument();
      });
    });

    test('shows all requests when All Requests filter selected', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields) => {
          if (fields.includes('request_id')) {
            return {
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          if (fields.includes('role')) {
            return {
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          return {
            order: jest.fn().mockResolvedValue({
              data: [
                { id: '1', status: 'Acknowledged', category: 'pothole', location: 'Main St', created_at: new Date().toISOString() },
                { id: '2', status: 'Resolved', category: 'water', location: 'Oak Ave', created_at: new Date().toISOString() },
              ],
              error: null,
            }),
          };
        }),
        insert: jest.fn(),
      });

      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/pothole/i)).toBeInTheDocument();
      });

      const allBtn = screen.getByRole('button', { name: /All Requests/i });
      await userEvent.click(allBtn);

      await waitFor(() => {
        expect(screen.getByText(/pothole/i)).toBeInTheDocument();
        expect(screen.getByText(/water/i)).toBeInTheDocument();
      });
    });
  });

  describe('Request Assignment', () => {



    test('hides dropdown for resolved requests', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields) => {
          if (fields.includes('request_id')) {
            return {
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          if (fields.includes('role')) {
            return {
              in: jest.fn().mockResolvedValue({
                data: [
                  { id: 'staff-1', full_name: 'John Doe', email: 'john@example.com', role: 'staff' },
                ],
                error: null,
              }),
            };
          }
          return {
            order: jest.fn().mockResolvedValue({
              data: [
                { id: '1', status: 'Resolved', category: 'pothole', location: 'Main St', created_at: new Date().toISOString() },
              ],
              error: null,
            }),
          };
        }),
        insert: jest.fn(),
      });

      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.queryByDisplayValue(/Assign to staff/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('View Details Button', () => {
    test('navigates to request details on button click', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields) => {
          if (fields.includes('request_id')) {
            return {
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          if (fields.includes('role')) {
            return {
              in: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            };
          }
          return {
            order: jest.fn().mockResolvedValue({
              data: [
                { id: 'req-123', status: 'Acknowledged', category: 'pothole', location: 'Main St', created_at: new Date().toISOString() },
              ],
              error: null,
            }),
          };
        }),
        insert: jest.fn(),
      });

      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /View Details/i })).toBeInTheDocument();
      });

      const viewBtn = screen.getByRole('button', { name: /View Details/i });
      await userEvent.click(viewBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/requests/req-123');
    });
  });

  describe('Error Handling', () => {
    test('displays error message on data fetch failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-1' } },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields) => {
          if (fields.includes('request_id')) {
            return {
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Failed to fetch assignments' },
              }),
            };
          }
          return {
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
            in: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }),
        insert: jest.fn(),
      });

      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Error:/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

  });

  describe('Empty State', () => {
    test('displays no requests found message', async () => {
      renderWithRouter(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/No requests found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Status Classes', () => {
  });
});
