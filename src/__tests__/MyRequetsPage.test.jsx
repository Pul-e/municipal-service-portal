import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyRequestsPage from '../pages/MyRequestsPage';
import { supabase } from '../supabaseClient';

jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
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
  useNavigate: () => mockNavigate,
}));

let mockRequests = [];

function createQueryBuilder(table) {
  const builder = {
    filters: {},

    select: jest.fn(function () {
      return this;
    }),

    eq: jest.fn(function () {
      return this;
    }),

    order: jest.fn(function () {
      return Promise.resolve({
        data: mockRequests,
        error: null,
      });
    }),

    insert: jest.fn(function () {
      return Promise.resolve({
        error: null,
      });
    }),

    then(resolve, reject) {
      return Promise.resolve({
        data: mockRequests,
        error: null,
      }).then(resolve, reject);
    },
  };

  return builder;
}

beforeEach(() => {
  jest.clearAllMocks();

  jest.useFakeTimers();

  mockRequests = [
    {
      id: 1,
      category: 'Pothole',
      status: 'Pending',
      location: 'Main Road',
      municipality: 'Johannesburg',
      ward: '12',
      created_at: new Date().toISOString(),
      feedback_submitted: false,
    },
    {
      id: 2,
      category: 'Water Leak',
      status: 'Resolved',
      location: '2nd Street',
      municipality: 'Johannesburg',
      ward: '8',
      created_at: new Date().toISOString(),
      feedback_submitted: false,
    },
  ];

  supabase.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'user-1',
      },
    },
  });

  supabase.from.mockImplementation((table) =>
    createQueryBuilder(table)
  );
});

afterEach(() => {
  jest.useRealTimers();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <MyRequestsPage />
    </MemoryRouter>
  );
}

test('shows loading state initially', () => {
  renderPage();

  expect(
    screen.getByText(/loading your requests/i)
  ).toBeInTheDocument();
});

test('loads and displays requests', async () => {
  renderPage();

  expect(
    await screen.findByText(/track and manage your reported municipal issues/i)
  ).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText(/johannesburg, ward 12/i)).toBeInTheDocument();
  });
});
test('shows no requests state', async () => {
  mockRequests = [];

  renderPage();

  expect(
    await screen.findByText(/no requests found/i)
  ).toBeInTheDocument();
});

test('filters open requests', async () => {
  renderPage();

  const openTab = await screen.findByRole('tab', {
    name: /open/i,
  });

  fireEvent.click(openTab);

  await waitFor(() => {
    expect(
      screen.getByText(/johannesburg, ward 12/i)
    ).toBeInTheDocument();
  });

  expect(
    screen.queryByText(/ward 8/i)
  ).not.toBeInTheDocument();
});
test('filters resolved requests', async () => {
  renderPage();

  const resolvedTab = await screen.findByRole('tab', {
    name: /resolved/i,
  });

  fireEvent.click(resolvedTab);

  await waitFor(() => {
    expect(screen.getByText(/water leak/i)).toBeInTheDocument();
  });

  expect(screen.queryByText(/pothole/i)).not.toBeInTheDocument();
});

test('navigates to request details page', async () => {
  renderPage();

  const detailButtons = await screen.findAllByText(/view details/i);

  fireEvent.click(detailButtons[0]);

  expect(mockNavigate).toHaveBeenCalledWith('/requests/1');
});

test('opens feedback form', async () => {
  renderPage();

  const feedbackButton = await screen.findByText(/rate service/i);

  fireEvent.click(feedbackButton);

  expect(
    await screen.findByText(/rate your experience/i)
  ).toBeInTheDocument();

  expect(
    screen.getByText(/water leak at 2nd street/i)
  ).toBeInTheDocument();
});

test('submits feedback successfully', async () => {
  renderPage();

  const feedbackButton = await screen.findByText(/rate service/i);

  fireEvent.click(feedbackButton);

  const starButtons = await screen.findAllByRole('button', {
    name: /star/i,
  });

  fireEvent.click(starButtons[4]);

  fireEvent.change(
    screen.getByPlaceholderText(/tell us about your experience/i),
    {
      target: {
        value: 'Great service!',
      },
    }
  );

  const submitButton = screen.getByText(/submit feedback/i);

  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(
      screen.getByText(/thank you for your feedback/i)
    ).toBeInTheDocument();
  });
});

test('shows feedback error if user not logged in', async () => {
  // First call = page load user
  // Second call = feedback submit user
  supabase.auth.getUser
    .mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
        },
      },
    })
    .mockResolvedValueOnce({
      data: {
        user: null,
      },
      error: null,
    });

  renderPage();

const feedbackButton = await screen.findByRole('button', {
  name: /leave feedback/i,
});
  fireEvent.click(feedbackButton);

  const starButtons = await screen.findAllByRole('button', {
    name: /star/i,
  });

  fireEvent.click(starButtons[4]);

  fireEvent.click(
    screen.getByRole('button', {
      name: /submit feedback/i,
    })
  );

  expect(
    await screen.findByText(/must be logged in/i)
  ).toBeInTheDocument();
});
test('shows feedback submitted badge', async () => {
  mockRequests = [
    {
      id: 1,
      category: 'Electricity',
      status: 'Resolved',
      location: 'Power Station',
      municipality: 'Johannesburg',
      ward: '4',
      created_at: new Date().toISOString(),
      feedback_submitted: true,
    },
  ];

  renderPage();

  expect(
    await screen.findByText(/feedback submitted/i)
  ).toBeInTheDocument();
});

test('cancel feedback closes form', async () => {
  renderPage();

  const feedbackButton = await screen.findByText(/rate service/i);

  fireEvent.click(feedbackButton);

  expect(
    await screen.findByText(/rate your experience/i)
  ).toBeInTheDocument();

  fireEvent.click(screen.getByText(/cancel/i));

  await waitFor(() => {
    expect(
      screen.queryByText(/rate your experience/i)
    ).not.toBeInTheDocument();
  });
});

test('back button navigates to dashboard', async () => {
  renderPage();

  const backButton = await screen.findByText(/back to dashboard/i);

  fireEvent.click(backButton);

  expect(mockNavigate).toHaveBeenCalledWith(
    '/resident/dashboard'
  );
});

test('help section renders', async () => {
  renderPage();

  expect(
    await screen.findByText(/need help/i)
  ).toBeInTheDocument();

  expect(
    screen.getByText(/0800 123 456/i)
  ).toBeInTheDocument();

  expect(
    screen.getByText(/support@municipalconnect.co.za/i)
  ).toBeInTheDocument();
});