import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportIssuePage from '../pages/ReportIssuePage';
import { supabase } from '../supabaseClient';

jest.mock('../supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
    storage: {
      from: jest.fn(),
    },
  },
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../components/InteractiveMap', () => {
  return function MockInteractiveMap({ onLocationSelect }) {
    return (
      <button
        onClick={() =>
          onLocationSelect({
            lat: -26.2041,
            lng: 28.0473,
          })
        }
      >
        Select Mock Location
      </button>
    );
  };
});

function createQueryBuilder() {
  const builder = {
    select: jest.fn(function () {
      return this;
    }),

    not: jest.fn(function () {
      return Promise.resolve({
        data: [],
        error: null,
      });
    }),

    insert: jest.fn(function () {
      return Promise.resolve({
        error: null,
      });
    }),
  };

  return builder;
}

beforeEach(() => {
  jest.clearAllMocks();

  global.alert = jest.fn();

  supabase.from.mockImplementation(() => createQueryBuilder());

  supabase.rpc.mockResolvedValue({
    data: [
      {
        ward_no: '12',
        municipali: 'Johannesburg',
        province: 'Gauteng',
        ward_id: 'ward-12',
      },
    ],
    error: null,
  });

  supabase.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'user-1',
      },
    },
  });

  supabase.storage.from.mockReturnValue({
    upload: jest.fn().mockResolvedValue({
      error: null,
      data: {},
    }),

    getPublicUrl: jest.fn().mockReturnValue({
      data: {
        publicUrl: 'https://image.url/test.jpg',
      },
    }),
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ReportIssuePage />
    </MemoryRouter>
  );
}

test('renders report issue form', async () => {
  renderPage();

  expect(screen.getByText(/report a service issue/i)).toBeInTheDocument();

  expect(screen.getByLabelText(/issue category/i)).toBeInTheDocument();

  expect(screen.getByLabelText(/description/i)).toBeInTheDocument();

  expect(screen.getByRole('button', { name: /submit report/i })).toBeInTheDocument();
});

test('selects map location successfully', async () => {
  renderPage();

  const locationButton = screen.getByText(/select mock location/i);

  fireEvent.click(locationButton);

  expect(await screen.findByText(/selected location/i)).toBeInTheDocument();

  expect(screen.getByText(/ward 12/i)).toBeInTheDocument();
});

test('submits report successfully', async () => {
  renderPage();

  fireEvent.change(screen.getByLabelText(/issue category/i), {
    target: { value: 'pothole' },
  });

  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'Large pothole near traffic light' },
  });

  fireEvent.click(screen.getByText(/select mock location/i));

  const submitButton = screen.getByRole('button', {
    name: /submit report/i,
  });

  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(global.alert).toHaveBeenCalledWith(
      'Report submitted successfully!'
    );
  });

  expect(mockNavigate).toHaveBeenCalledWith('/my-requests');
});

test('shows error if no location selected', async () => {
  renderPage();

  fireEvent.change(screen.getByLabelText(/issue category/i), {
    target: { value: 'pothole' },
  });

  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'Broken road' },
  });

  const form = screen.getByRole('form', {
    hidden: true,
  });

  fireEvent.submit(form);

  expect(
    await screen.findByText(/please click on the map/i)
  ).toBeInTheDocument();
});

test('shows error when user not signed in', async () => {
  supabase.auth.getUser.mockResolvedValue({
    data: {
      user: null,
    },
  });

  renderPage();

  fireEvent.change(screen.getByLabelText(/issue category/i), {
    target: { value: 'pothole' },
  });

  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'Broken road' },
  });

  fireEvent.click(screen.getByText(/select mock location/i));

  const submitButton = screen.getByRole('button', {
    name: /submit report/i,
  });

  fireEvent.click(submitButton);

  expect(
    await screen.findByText(/must be signed in/i)
  ).toBeInTheDocument();
});

test('shows upload error for large image', async () => {
  renderPage();

  const file = new File(['test'], 'large.png', {
    type: 'image/png',
  });

  Object.defineProperty(file, 'size', {
    value: 6 * 1024 * 1024,
  });

  const input = screen.getByLabelText(/upload photo/i);

  fireEvent.change(input, {
    target: {
      files: [file],
    },
  });

  expect(
    await screen.findByText(/image must be less than 5mb/i)
  ).toBeInTheDocument();
});

test('shows upload error for invalid image type', async () => {
  renderPage();

  const file = new File(['test'], 'bad.pdf', {
    type: 'application/pdf',
  });

  Object.defineProperty(file, 'size', {
    value: 1000,
  });

  const input = screen.getByLabelText(/upload photo/i);

  fireEvent.change(input, {
    target: {
      files: [file],
    },
  });

  expect(
    await screen.findByText(/only jpeg, png, gif, or webp/i)
  ).toBeInTheDocument();
});

test('uploads image successfully', async () => {
  renderPage();

  const file = new File(['image'], 'photo.png', {
    type: 'image/png',
  });

  Object.defineProperty(file, 'size', {
    value: 1000,
  });

  const input = screen.getByLabelText(/upload photo/i);

  fireEvent.change(input, {
    target: {
      files: [file],
    },
  });

  expect(await screen.findByAltText(/preview/i)).toBeInTheDocument();
});

test('shows insert error if report submission fails', async () => {
  supabase.from.mockImplementation(() => ({
    select: jest.fn(function () {
      return this;
    }),

    not: jest.fn(function () {
      return Promise.resolve({
        data: [],
        error: null,
      });
    }),

    insert: jest.fn(function () {
      return Promise.resolve({
        error: {
          message: 'Insert failed',
        },
      });
    }),
  }));

  renderPage();

  fireEvent.change(screen.getByLabelText(/issue category/i), {
    target: { value: 'pothole' },
  });

  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'Broken road' },
  });

  fireEvent.click(screen.getByText(/select mock location/i));

  fireEvent.click(
    screen.getByRole('button', {
      name: /submit report/i,
    })
  );

  expect(
    await screen.findByText(/failed to submit report/i)
  ).toBeInTheDocument();
});