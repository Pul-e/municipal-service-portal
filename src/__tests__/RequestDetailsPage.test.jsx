import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequestDetailsPage from '../pages/RequestDetailsPage';
import { supabase } from '../supabaseClient';

jest.mock('../supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../components/StatusBadge', () => {
  return function MockStatusBadge({ status }) {
    return <span>{status}</span>;
  };
});

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    id: '1',
  }),
  useNavigate: () => mockNavigate,
}));

let mockRequest;
let mockFeedback;
let mockAssignment;

function createQueryBuilder(table) {
  return {
    select: jest.fn(function () {
      return this;
    }),

    eq: jest.fn(function () {
      return this;
    }),

    is: jest.fn(function () {
      return this;
    }),

    single: jest.fn(function () {
      if (table === 'service_requests') {
        return Promise.resolve({
          data: mockRequest,
          error: null,
        });
      }

      return Promise.resolve({
        data: null,
        error: null,
      });
    }),

    maybeSingle: jest.fn(function () {
      if (table === 'feedback') {
        return Promise.resolve({
          data: mockFeedback,
          error: null,
        });
      }

      if (table === 'service_request_assignments') {
        return Promise.resolve({
          data: mockAssignment,
          error: null,
        });
      }

      return Promise.resolve({
        data: null,
        error: null,
      });
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  mockRequest = {
    id: 1,
    category: 'burst-pipe',
    status: 'Resolved',
    description: 'Major pipe leak near school',
    municipality: 'Johannesburg',
    ward: '12',
    address: '10 Main Road',
    location_point: 'POINT(28.0473 -26.2041)',
    created_at: '2026-05-10T10:00:00',
    updated_at: '2026-05-11T12:00:00',
    resolved_at: '2026-05-12T13:00:00',
    resolution_time_minutes: 180,
    image_url: 'https://example.com/image.jpg',
  };

  mockFeedback = {
    rating: 5,
    comment: 'Excellent service',
    created_at: '2026-05-13T10:00:00',
  };

  mockAssignment = {
    assigned_at: '2026-05-10T11:00:00',
    profiles: {
      full_name: 'Worker User',
      email: 'worker@test.com',
    },
  };

  supabase.from.mockImplementation((table) =>
    createQueryBuilder(table)
  );
});

function renderPage() {
  return render(
    <MemoryRouter>
      <RequestDetailsPage />
    </MemoryRouter>
  );
}

test('shows loading state initially', () => {
  renderPage();

  expect(
    screen.getByText(/loading request details/i)
  ).toBeInTheDocument();
});

test('loads and displays full request details', async () => {renderPage();

  await waitFor(() => {
    expect(screen.queryByText(/loading request details/i)).not.toBeInTheDocument();
  });

  expect(screen.getByText(/BURST PIPE/i)).toBeInTheDocument();
  expect(screen.getByText(/major pipe leak near school/i)).toBeInTheDocument();
  expect(screen.getByText(/johannesburg, ward 12/i)).toBeInTheDocument();
  expect(screen.getByText(/10 main road/i)).toBeInTheDocument();
  expect(screen.getByText(/resolution time/i)).toBeInTheDocument();
  expect(screen.getByText(/3 hours 0 minutes/i)).toBeInTheDocument();});

test('shows request image when image exists', async () => {
  renderPage();

  expect(
    await screen.findByAltText(/service request evidence/i)
  ).toBeInTheDocument();
});

test('shows assignment information', async () => {
  renderPage();

  expect(
    await screen.findByText(/assigned to/i)
  ).toBeInTheDocument();

  expect(
    screen.getByText(/worker user/i)
  ).toBeInTheDocument();
});

test('shows feedback section', async () => {
  renderPage();

  expect(
    await screen.findByText(/your feedback/i)
  ).toBeInTheDocument();

  expect(
    screen.getByText(/excellent service/i)
  ).toBeInTheDocument();

  expect(
    screen.getByText(/5\/5/i)
  ).toBeInTheDocument();
});

test('shows no feedback state', async () => {
  mockFeedback = null;

  renderPage();

  expect(
    await screen.findByText(/no feedback submitted yet/i)
  ).toBeInTheDocument();
});

test('shows fallback description', async () => {
  mockRequest.description = '';

  renderPage();

  expect(
    await screen.findByText(/no description provided/i)
  ).toBeInTheDocument();
});

test('shows fallback municipality and ward', async () => {
  mockRequest.municipality = '';
  mockRequest.ward = '';

  renderPage();

  expect(
    await screen.findByText(/unknown municipality/i)
  ).toBeInTheDocument();

  expect(
    screen.getByText(/ward unknown/i)
  ).toBeInTheDocument();
});

test('shows geojson location format', async () => {
  mockRequest.location_point = {
    coordinates: [28.0473, -26.2041],
  };

  renderPage();

  expect(
    await screen.findByText(/point/i)
  ).toBeInTheDocument();
});

test('shows no assignment section when assignment missing', async () => {
  mockAssignment = null;

  renderPage();

  await screen.findByText(/request details/i);

  expect(
    screen.queryByText(/assigned to/i)
  ).not.toBeInTheDocument();
});

test('shows fallback date when date missing', async () => {
  mockRequest.created_at = null;
  mockRequest.updated_at = null;
  mockRequest.resolved_at = null;
  mockRequest.resolution_time_minutes = null;

  renderPage();

  expect(
    await screen.findByText(/reported/i)
  ).toBeInTheDocument();

  expect(screen.getByText(/N\/A/i)).toBeInTheDocument();
});

test('shows error state when request missing', async () => {
  mockRequest = null;

  renderPage();

  expect(
    await screen.findByText(/request not found/i)
  ).toBeInTheDocument();
});

test('back button navigates back', async () => {
  renderPage();

  const backButtons = await screen.findAllByText(/back/i);

  fireEvent.click(backButtons[0]);

  expect(mockNavigate).toHaveBeenCalledWith(-1);
});