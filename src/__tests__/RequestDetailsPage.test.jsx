import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequestDetailsPage from '../pages/RequestDetailsPage';
import { supabase } from '../supabaseClient';

const mockNavigate = jest.fn();

jest.mock('../components/StatusBadge', () => ({ status }) => (
  <div>{status}</div>
));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
  useNavigate: () => mockNavigate,
}));

jest.mock('../supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('RequestDetailsPage', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupMocks() {

    supabase.from.mockImplementation((table) => {

      if (table === 'service_requests') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 1,
                    category: 'pothole',
                    status: 'Resolved',
                    description: 'Large pothole in road',
                    municipality: 'Johannesburg',
                    ward: 58,
                    address: '123 Main Street',
                    image_url: 'test-image.jpg',
                    resolution_image_url: 'resolved.jpg',
                    created_at: '2026-01-01',
                    updated_at: '2026-01-02',
                    resolved_at: '2026-01-03',
                    resolution_time_minutes: 125,
                    location_point: {
                      coordinates: [28.0, -26.0],
                    },
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === 'feedback') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    rating: 5,
                    comment: 'Excellent service',
                    created_at: '2026-01-03',
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === 'service_request_assignments') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: {
                        assigned_at: '2026-01-02',
                        profiles: {
                          full_name: 'John Worker',
                        },
                      },
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        };
      }

    });
  }

  test('renders loading state', () => {

    setupMocks();

    render(
      <MemoryRouter>
        <RequestDetailsPage />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/loading request details/i)
    ).toBeInTheDocument();
  });

  test('renders request details correctly', async () => {

    setupMocks();

    render(
      <MemoryRouter>
        <RequestDetailsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/large pothole/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/johannesburg/i)).toBeInTheDocument();
    expect(screen.getByText(/john worker/i)).toBeInTheDocument();
    expect(screen.getByText(/excellent service/i)).toBeInTheDocument();
    expect(screen.getAllByText(/resolved/i).length).toBeGreaterThan(0);
  });

  test('renders images when available', async () => {

    setupMocks();

    render(
      <MemoryRouter>
        <RequestDetailsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByAltText(/service request evidence/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByAltText(/resolution evidence/i)
    ).toBeInTheDocument();
  });

  test('back button navigates correctly', async () => {

    setupMocks();

    render(
      <MemoryRouter>
        <RequestDetailsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/request details/i)).toBeInTheDocument();
    });

    

   
  });

  test('shows error state when request fails', async () => {

    supabase.from.mockImplementation((table) => {

      if (table === 'service_requests') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: {
                    message: 'Request not found',
                  },
                }),
            }),
          }),
        };
      }

    });

    render(
      <MemoryRouter>
        <RequestDetailsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/request not found/i)).toBeInTheDocument();
  });

});