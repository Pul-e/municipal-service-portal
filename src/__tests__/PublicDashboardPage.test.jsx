import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PublicDashboardPage from '../pages/PublicDashboardPage';

// Mock supabase BEFORE importing the component
jest.mock('../supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock InteractiveMap
jest.mock('../components/InteractiveMap', () => {
  return function MockMap({ onLocationSelect, markers }) {
    return (
      <div data-testid="interactive-map">
        Mock Map - {markers?.length || 0} markers
        <button onClick={() => onLocationSelect({ lat: -26.2023, lng: 28.0436 })}>
          Select Location
        </button>
      </div>
    );
  };
});

import { supabase } from '../supabaseClient';

describe('PublicDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  function setupMocks() {
    // Mock the full Supabase chain with proper data handling
    const mockSelect = jest.fn();
    const mockOrder = jest.fn();
    const mockLimit = jest.fn();
    const mockNeq = jest.fn();
    const mockEq = jest.fn();
    const mockNot = jest.fn();

    // For fetching requests: .select().order().limit()
    mockLimit.mockResolvedValue({
      data: [],
      error: null,
    });

    mockOrder.mockReturnValue({
      limit: mockLimit,
    });

    // For open count: .select().neq()
    mockNeq.mockResolvedValue({
      count: 0,
      error: null,
    });

    // For avg response time: .select().eq().not()
    mockNot.mockResolvedValue({
      data: [],
      error: null,
    });

    mockEq.mockReturnValue({
      not: mockNot,
    });

    // Main select - routes based on context
    mockSelect.mockImplementation((fields, options) => {
      if (options?.count === 'exact') {
        return {
          neq: mockNeq,
          eq: mockEq,
        };
      }
      // For markers fetch - no count option
      return {
        order: mockOrder,
        not: mockNot,
        eq: mockEq,
        neq: mockNeq,
      };
    });

    supabase.from.mockReturnValue({
      select: mockSelect,
    });
  }

  describe('Rendering', () => {
    test('renders the page with header', async () => {
      render(<PublicDashboardPage />);

      const heading = screen.getByRole('heading', { name: /Municipal Connect/i });
      expect(heading).toBeInTheDocument();
    });

    test('renders all main sections', async () => {
      render(<PublicDashboardPage />);

      expect(screen.getByText(/Service Delivery Map/i)).toBeInTheDocument();
      expect(screen.getByText(/Recent Reports in Your Area/i)).toBeInTheDocument();
      expect(screen.getByTestId('interactive-map')).toBeInTheDocument();
    });

    test('renders South Africa header', () => {
      render(<PublicDashboardPage />);
      expect(screen.getByText('South Africa')).toBeInTheDocument();
    });

    test('renders tagline', () => {
      render(<PublicDashboardPage />);
      expect(screen.getByText(/Report service issues in your ward/i)).toBeInTheDocument();
    });

    test('renders sign in link', async () => {
      render(<PublicDashboardPage />);

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /sign in/i });
        expect(link).toHaveAttribute('href', '/signin');
      });
    });
  });

  describe('Stats Display', () => {
    test('displays loading state initially', () => {
      render(<PublicDashboardPage />);
      const dashDashes = screen.getAllByText('—');
      expect(dashDashes.length).toBeGreaterThan(0);
    });

    test('displays stat labels', () => {
      render(<PublicDashboardPage />);

      expect(screen.getByText('Open Requests')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('Avg Response')).toBeInTheDocument();
    });

    test('displays open count after loading', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields, options) => {
          if (options?.count === 'exact') {
            return {
              neq: jest.fn().mockResolvedValue({ count: 5, error: null }),
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return {
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
            not: jest.fn().mockResolvedValue({ data: [], error: null }),
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }),
      });

      render(<PublicDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });
  });

  describe('Recent Reports', () => {
    test('displays empty state when no requests', async () => {
      render(<PublicDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/No reports yet/i)).toBeInTheDocument();
      });
    });

    test('displays request with category icon', async () => {
      const mockRequests = [
        {
          id: '1',
          category: 'pothole',
          location: 'Main Street',
          status: 'In Progress',
          created_at: new Date().toISOString(),
          municipality: 'Johannesburg',
          ward: '10',
        },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields, options) => {
          if (options?.count === 'exact') {
            return {
              neq: jest.fn().mockResolvedValue({ count: 0, error: null }),
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return {
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockRequests,
                error: null,
              }),
            }),
            not: jest.fn().mockResolvedValue({ data: [], error: null }),
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }),
      });

      render(<PublicDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/pothole/i)).toBeInTheDocument();
        expect(screen.getByText('⬛')).toBeInTheDocument();
        expect(screen.getByText(/Johannesburg/i)).toBeInTheDocument();
      });
    });

    test('displays request with ward info', async () => {
      const mockRequests = [
        {
          id: '1',
          category: 'burst-pipe',
          location: 'Test St',
          status: 'Pending',
          created_at: new Date().toISOString(),
          municipality: 'Cape Town',
          ward: '25',
        },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields, options) => {
          if (options?.count === 'exact') {
            return {
              neq: jest.fn().mockResolvedValue({ count: 0, error: null }),
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return {
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockRequests,
                error: null,
              }),
            }),
            not: jest.fn().mockResolvedValue({ data: [], error: null }),
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }),
      });

      render(<PublicDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Ward 25/i)).toBeInTheDocument();
        expect(screen.getByText(/Cape Town/i)).toBeInTheDocument();
      });
    });

    test('handles missing municipality gracefully', async () => {
      const mockRequests = [
        {
          id: '1',
          category: 'pothole',
          location: 'Test',
          status: 'Pending',
          created_at: new Date().toISOString(),
          municipality: null,
          ward: null,
        },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields, options) => {
          if (options?.count === 'exact') {
            return {
              neq: jest.fn().mockResolvedValue({ count: 0, error: null }),
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return {
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockRequests,
                error: null,
              }),
            }),
            not: jest.fn().mockResolvedValue({ data: [], error: null }),
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }),
      });

      render(<PublicDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Unknown Municipality/i)).toBeInTheDocument();
        expect(screen.getByText(/Ward not specified/i)).toBeInTheDocument();
      });
    });
  });

  describe('Map Section', () => {
    test('renders the map component', () => {
      render(<PublicDashboardPage />);
      expect(screen.getByTestId('interactive-map')).toBeInTheDocument();
    });

    test('displays map context text', () => {
      render(<PublicDashboardPage />);
      expect(screen.getByText(/Explore service requests across South Africa/i)).toBeInTheDocument();
    });

    test('displays marker count', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields, options) => {
          if (options?.count === 'exact') {
            return {
              neq: jest.fn().mockResolvedValue({ count: 0, error: null }),
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return {
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
            not: jest.fn().mockResolvedValue({
              data: [
                {
                  id: '1',
                  status: 'In Progress',
                  location_point: 'POINT(28.0436 -26.2023)',
                },
              ],
              error: null,
            }),
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }),
      });

      render(<PublicDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/1 requests shown/i)).toBeInTheDocument();
      });
    });

    test('renders legend when markers exist', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields, options) => {
          if (options?.count === 'exact') {
            return {
              neq: jest.fn().mockResolvedValue({ count: 0, error: null }),
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return {
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
            not: jest.fn().mockResolvedValue({
              data: [
                {
                  id: '1',
                  status: 'In Progress',
                  location_point: 'POINT(28.0436 -26.2023)',
                },
              ],
              error: null,
            }),
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }),
      });

      render(<PublicDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Acknowledged\/Pending/i)).toBeInTheDocument();
        expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
      });
    });

    test('displays data source attribution', () => {
      render(<PublicDashboardPage />);
      expect(screen.getByText(/South African Municipal Demarcation Board/i)).toBeInTheDocument();
    });
  });

  describe('Location Selection', () => {
    test('displays selected location when clicked', async () => {
      render(<PublicDashboardPage />);

      const selectBtn = screen.getByText('Select Location');
      await userEvent.click(selectBtn);

      await waitFor(() => {
        expect(screen.getByText(/📍 Selected:/i)).toBeInTheDocument();
        expect(screen.getByText(/-26.2023/)).toBeInTheDocument();
      });
    });
  });

  describe('timeAgo Function', () => {
    test('displays "just now" for recent times', async () => {
      const now = new Date();
      const mockRequests = [
        {
          id: '1',
          category: 'pothole',
          location: 'Test',
          status: 'Pending',
          created_at: now.toISOString(),
          municipality: 'JNB',
          ward: '1',
        },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields, options) => {
          if (options?.count === 'exact') {
            return {
              neq: jest.fn().mockResolvedValue({ count: 0, error: null }),
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return {
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockRequests,
                error: null,
              }),
            }),
            not: jest.fn().mockResolvedValue({ data: [], error: null }),
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }),
      });

      render(<PublicDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/just now/i)).toBeInTheDocument();
      });
    });

    test('displays minutes ago correctly', async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const mockRequests = [
        {
          id: '1',
          category: 'pothole',
          location: 'Test',
          status: 'Pending',
          created_at: fiveMinutesAgo.toISOString(),
          municipality: 'JNB',
          ward: '1',
        },
      ];

      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields, options) => {
          if (options?.count === 'exact') {
            return {
              neq: jest.fn().mockResolvedValue({ count: 0, error: null }),
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return {
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockRequests,
                error: null,
              }),
            }),
            not: jest.fn().mockResolvedValue({ data: [], error: null }),
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }),
      });

      render(<PublicDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/5m ago/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles request fetch error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      supabase.from.mockReturnValue({
        select: jest.fn().mockImplementation((fields, options) => {
          if (options?.count === 'exact') {
            return {
              neq: jest.fn().mockResolvedValue({ count: 0, error: null }),
              eq: jest.fn().mockReturnValue({
                not: jest.fn().mockResolvedValue({ data: [], error: null }),
              }),
            };
          }
          return {
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Request failed' },
              }),
            }),
            not: jest.fn().mockResolvedValue({ data: [], error: null }),
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }),
      });

      render(<PublicDashboardPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error fetching requests:',
          'Request failed'  // ← Changed to string, not object
        );
      });

      consoleSpy.mockRestore();
    });
  });
});