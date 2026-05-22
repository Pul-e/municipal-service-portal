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
  return function MockInteractiveMap({ onLocationSelect, markers = [] }) {
    return (
      <div>
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

        <p data-testid="marker-count">{markers.length}</p>
      </div>
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

test('equivalence test: valid minimum description submits successfully', async () => {
  renderPage();

  fireEvent.change(screen.getByLabelText(/issue category/i), {
    target: { value: 'pothole' },
  });

  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'Road' },
  });

  fireEvent.click(screen.getByText(/select mock location/i));

  fireEvent.click(
    screen.getByRole('button', {
      name: /submit report/i,
    })
  );

  await waitFor(() => {
    expect(global.alert).toHaveBeenCalledWith(
      'Report submitted successfully!'
    );
  });
});

test('boundary test: very long description handled correctly', async () => {
  renderPage();

  const longDescription = 'A'.repeat(1000);

  fireEvent.change(screen.getByLabelText(/issue category/i), {
    target: { value: 'power-outage' },
  });

  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: longDescription },
  });

  fireEvent.click(screen.getByText(/select mock location/i));

  fireEvent.click(
    screen.getByRole('button', {
      name: /submit report/i,
    })
  );

  await waitFor(() => {
    expect(global.alert).toHaveBeenCalled();
  });
});

test('equivalence test: empty category prevents submission', async () => {
  renderPage();

  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'Broken street light' },
  });

  fireEvent.click(screen.getByText(/select mock location/i));

  const submitButton = screen.getByRole('button', {
    name: /submit report/i,
  });

  fireEvent.click(submitButton);

  expect(global.alert).not.toHaveBeenCalled();
});

test('boundary test: empty description prevents submission', async () => {
  renderPage();

  fireEvent.change(screen.getByLabelText(/issue category/i), {
    target: { value: 'street-light' },
  });

  fireEvent.click(screen.getByText(/select mock location/i));

  const submitButton = screen.getByRole('button', {
    name: /submit report/i,
  });

  fireEvent.click(submitButton);

  expect(global.alert).not.toHaveBeenCalled();
});

test('boundary test: image exactly 5MB accepted', async () => {
  renderPage();

  const file = new File(['image'], 'photo.png', {
    type: 'image/png',
  });

  Object.defineProperty(file, 'size', {
    value: 5 * 1024 * 1024,
  });

  const input = screen.getByLabelText(/upload photo/i);

  fireEvent.change(input, {
    target: {
      files: [file],
    },
  });

  expect(await screen.findByAltText(/preview/i)).toBeInTheDocument();
});

test('shows no ward found when selected location has no ward match', async () => {
  supabase.rpc.mockResolvedValue({
    data: [],
    error: null,
  });

  renderPage();

  fireEvent.click(screen.getByText(/select mock location/i));

  expect(
    await screen.findByText(/no ward found/i)
  ).toBeInTheDocument();
});

test('handles ward lookup failure without crashing', async () => {
  supabase.rpc.mockRejectedValue(new Error('RPC failed'));

  renderPage();

  fireEvent.click(screen.getByText(/select mock location/i));

  expect(
    await screen.findByText(/no ward found/i)
  ).toBeInTheDocument();
});

test('removes selected image preview when remove button is clicked', async () => {
  renderPage();

  const file = new File(['image'], 'photo.png', {
    type: 'image/png',
  });

  Object.defineProperty(file, 'size', {
    value: 1000,
  });

  fireEvent.change(screen.getByLabelText(/upload photo/i), {
    target: {
      files: [file],
    },
  });

  expect(await screen.findByAltText(/preview/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /remove/i }));

  expect(screen.queryByAltText(/preview/i)).not.toBeInTheDocument();
});

test('continues submitting report when image upload fails', async () => {
  supabase.storage.from.mockReturnValue({
    upload: jest.fn().mockResolvedValue({
      error: {
        message: 'Upload failed',
      },
    }),
    getPublicUrl: jest.fn(),
  });

  renderPage();

  const file = new File(['image'], 'photo.png', {
    type: 'image/png',
  });

  Object.defineProperty(file, 'size', {
    value: 1000,
  });

  fireEvent.change(screen.getByLabelText(/upload photo/i), {
    target: {
      files: [file],
    },
  });

  expect(await screen.findByAltText(/preview/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/issue category/i), {
    target: { value: 'pothole' },
  });

  fireEvent.change(screen.getByLabelText(/description/i), {
    target: { value: 'Large pothole near the school entrance' },
  });

  fireEvent.click(screen.getByText(/select mock location/i));

  fireEvent.click(screen.getByRole('button', { name: /submit report/i }));

  await waitFor(() => {
    expect(global.alert).toHaveBeenCalledWith(
      'Report submitted successfully!'
    );
  });
});

test('displays existing unresolved report markers on the map', async () => {
  supabase.from.mockImplementation(() => ({
    select: jest.fn(function () {
      return this;
    }),

    not: jest.fn(function () {
      return Promise.resolve({
        data: [
          {
            id: 1,
            status: 'Pending',
            location_point: 'POINT(28.0473 -26.2041)',
            resolved_at: null,
          },
          {
            id: 2,
            status: 'Resolved',
            location_point: 'POINT(28.1000 -26.3000)',
            resolved_at: new Date().toISOString(),
          },
        ],
        error: null,
      });
    }),

    insert: jest.fn(function () {
      return Promise.resolve({
        error: null,
      });
    }),
  }));

  renderPage();

await waitFor(() => {
  expect(screen.getByTestId('marker-count')).toHaveTextContent('2');
});
});

test('filters out resolved reports older than five days from map markers', async () => {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 6);

  supabase.from.mockImplementation(() => ({
    select: jest.fn(function () {
      return this;
    }),

    not: jest.fn(function () {
      return Promise.resolve({
        data: [
          {
            id: 1,
            status: 'Resolved',
            location_point: 'POINT(28.0473 -26.2041)',
            resolved_at: oldDate.toISOString(),
          },
          {
            id: 2,
            status: 'Pending',
            location_point: {
              coordinates: [28.1000, -26.3000],
            },
            resolved_at: null,
          },
        ],
        error: null,
      });
    }),

    insert: jest.fn(function () {
      return Promise.resolve({
        error: null,
      });
    }),
  }));

  renderPage();

  await waitFor(() => {
    expect(screen.getByTestId('marker-count')).toHaveTextContent('1');
  });
});