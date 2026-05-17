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

function createQueryBuilder() {
  return {
    select: jest.fn(function () {
      return this;
    }),
    eq: jest.fn(function () {
      return this;
    }),
    in: jest.fn(function () {
      return Promise.resolve({
        data: [],
        error: null,
      });
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
  };
}

beforeEach(() => {
  jest.clearAllMocks();

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
    error: null,
  });

  supabase.from.mockImplementation(() => createQueryBuilder());
});

function renderPage() {
  return render(
    <MemoryRouter>
      <MyRequestsPage />
    </MemoryRouter>
  );
}

async function openFeedbackForm() {
  const feedbackButtons = await screen.findAllByRole('button', {
    name: /feedback|rate service/i,
  });

  fireEvent.click(feedbackButtons[0]);
}

async function chooseStar(index) {
  const starButtons = await screen.findAllByRole('button', {
    name: /star/i,
  });

  fireEvent.click(starButtons[index]);
}

function enterFeedbackComment(comment) {
  const commentBox = screen.queryByPlaceholderText(
    /tell us about your experience|comment/i
  );

  if (commentBox) {
    fireEvent.change(commentBox, {
      target: { value: comment },
    });
  }
}

function submitFeedback() {
  fireEvent.click(
    screen.getByRole('button', { name: /submit feedback/i })
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

  expect(screen.getByText(/johannesburg, ward 12/i)).toBeInTheDocument();
  expect(screen.getByText(/johannesburg, ward 8/i)).toBeInTheDocument();
});

test('shows no requests state', async () => {
  mockRequests = [];

  renderPage();

  await waitFor(() => {
    expect(
      screen.getByText(/no requests|no service requests|no reports/i)
    ).toBeInTheDocument();
  });
});

test('filters open requests', async () => {
  renderPage();

  const openTab = await screen.findByRole('tab', {
    name: /open/i,
  });

  fireEvent.click(openTab);

  await waitFor(() => {
    expect(screen.getByText(/pothole/i)).toBeInTheDocument();
  });
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
});

test('navigates to request details page', async () => {
  renderPage();

  const detailButtons = await screen.findAllByText(/view details/i);

  fireEvent.click(detailButtons[0]);

  expect(mockNavigate).toHaveBeenCalledWith('/requests/1');
});

test('opens feedback form', async () => {
  renderPage();

  await openFeedbackForm();

  expect(
    screen.getByRole('button', { name: /submit feedback/i })
  ).toBeInTheDocument();
});

test('boundary test: minimum feedback rating accepted', async () => {
  renderPage();

  await openFeedbackForm();
  await chooseStar(0);

  enterFeedbackComment('Bad service');
  submitFeedback();

  expect(
    await screen.findByText(/thank you for your feedback/i)
  ).toBeInTheDocument();
});

test('boundary test: maximum feedback rating accepted', async () => {
  renderPage();

  await openFeedbackForm();
  await chooseStar(4);

  enterFeedbackComment('Excellent service');
  submitFeedback();

  expect(
    await screen.findByText(/thank you for your feedback/i)
  ).toBeInTheDocument();
});

test('equivalence test: valid feedback submission succeeds', async () => {
  renderPage();

  await openFeedbackForm();
  await chooseStar(3);

  enterFeedbackComment('Good service overall');
  submitFeedback();

  expect(
    await screen.findByText(/thank you for your feedback/i)
  ).toBeInTheDocument();
});

test('equivalence test: empty feedback comment still submits', async () => {
  renderPage();

  await openFeedbackForm();
  await chooseStar(2);

  submitFeedback();

  expect(
    await screen.findByText(/thank you for your feedback/i)
  ).toBeInTheDocument();
});

test('submits feedback successfully', async () => {
  renderPage();

  await openFeedbackForm();
  await chooseStar(4);

  enterFeedbackComment('Great service!');
  submitFeedback();

  expect(
    await screen.findByText(/thank you for your feedback/i)
  ).toBeInTheDocument();
});

test('shows feedback error if user not logged in', async () => {
  supabase.auth.getUser
    .mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-1',
        },
      },
      error: null,
    })
    .mockResolvedValueOnce({
      data: {
        user: null,
      },
      error: null,
    });

  renderPage();

  await openFeedbackForm();
  await chooseStar(4);
  submitFeedback();

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
    await screen.findByText(/feedback submitted|submitted/i)
  ).toBeInTheDocument();
});

test('cancel feedback closes form', async () => {
  renderPage();

  await openFeedbackForm();

  fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

  await waitFor(() => {
    expect(
      screen.queryByRole('button', { name: /submit feedback/i })
    ).not.toBeInTheDocument();
  });
});

test('back button navigates to dashboard', async () => {
  renderPage();

  const backButton = await screen.findByText(/back to dashboard/i);

  fireEvent.click(backButton);

  expect(mockNavigate).toHaveBeenCalledWith('/resident/dashboard');
});

test('help section renders', async () => {
  renderPage();

  expect(
    await screen.findByText(/need help/i)
  ).toBeInTheDocument();

  expect(screen.getByText(/0800 123 456/i)).toBeInTheDocument();
  expect(
    screen.getByText(/support@municipalconnect.co.za/i)
  ).toBeInTheDocument();
});