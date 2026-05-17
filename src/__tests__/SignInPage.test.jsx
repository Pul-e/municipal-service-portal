import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SignInPage from '../pages/SignInPage';
import { supabase } from '../supabaseClient';

jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function createQueryBuilder(profileData = null, profileError = null) {
  return {
    select: jest.fn(function () {
      return this;
    }),

    eq: jest.fn(function () {
      return this;
    }),

    single: jest.fn(function () {
      return Promise.resolve({
        data: profileData,
        error: profileError,
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

  supabase.auth.signInWithPassword.mockResolvedValue({
    data: {
      user: {
        id: 'user-1',
        email: 'user@test.com',
      },
    },
    error: null,
  });

  supabase.auth.signInWithOAuth.mockResolvedValue({
    error: null,
  });

  supabase.from.mockImplementation(() =>
    createQueryBuilder(
      {
        role: 'user',
      },
      null
    )
  );
});

function renderPage() {
  return render(
    <MemoryRouter>
      <SignInPage />
    </MemoryRouter>
  );
}

test('renders sign in form', () => {
  renderPage();

  expect(
    screen.getByText(/welcome back/i)
  ).toBeInTheDocument();

  expect(
    screen.getByLabelText(/email address/i)
  ).toBeInTheDocument();

  expect(
    screen.getByLabelText(/password/i)
  ).toBeInTheDocument();

  expect(
    screen.getByRole('button', {
      name: /sign in/i,
    })
  ).toBeInTheDocument();
});

test('signs in normal user successfully', async () => {
  renderPage();

  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: {
      value: 'user@test.com',
    },
  });

  fireEvent.change(screen.getByLabelText(/password/i), {
    target: {
      value: 'password123',
    },
  });

  fireEvent.click(
    screen.getByRole('button', {
      name: /^sign in$/i,
    })
  );

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith(
      '/resident/dashboard'
    );
  });
});

test('redirects admin user correctly', async () => {
  supabase.from.mockImplementation(() =>
    createQueryBuilder(
      {
        role: 'admin',
      },
      null
    )
  );

  renderPage();

  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: {
      value: 'admin@test.com',
    },
  });

  fireEvent.change(screen.getByLabelText(/password/i), {
    target: {
      value: 'password123',
    },
  });

  fireEvent.click(
    screen.getByRole('button', {
      name: /^sign in$/i,
    })
  );

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith(
      '/admin/dashboard'
    );
  });
});

test('redirects staff user correctly', async () => {
  supabase.from.mockImplementation(() =>
    createQueryBuilder(
      {
        role: 'staff',
      },
      null
    )
  );

  renderPage();

  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: {
      value: 'staff@test.com',
    },
  });

  fireEvent.change(screen.getByLabelText(/password/i), {
    target: {
      value: 'password123',
    },
  });

  fireEvent.click(
    screen.getByRole('button', {
      name: /^sign in$/i,
    })
  );

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith(
      '/worker/dashboard'
    );
  });
});

test('creates default profile if profile missing', async () => {
  supabase.from.mockImplementation(() =>
    createQueryBuilder(
      null,
      {
        code: 'PGRST116',
      }
    )
  );

  renderPage();

  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: {
      value: 'new@test.com',
    },
  });

  fireEvent.change(screen.getByLabelText(/password/i), {
    target: {
      value: 'password123',
    },
  });

  fireEvent.click(
    screen.getByRole('button', {
      name: /^sign in$/i,
    })
  );

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith(
      '/resident/dashboard'
    );
  });
});

test('shows sign in error message', async () => {
  supabase.auth.signInWithPassword.mockResolvedValue({
    data: null,
    error: {
      message: 'Invalid login credentials',
    },
  });

  renderPage();

  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: {
      value: 'bad@test.com',
    },
  });

  fireEvent.change(screen.getByLabelText(/password/i), {
    target: {
      value: 'wrongpassword',
    },
  });

  fireEvent.click(
    screen.getByRole('button', {
      name: /^sign in$/i,
    })
  );

  expect(
    await screen.findByText(/invalid login credentials/i)
  ).toBeInTheDocument();
});

test('shows profile error message', async () => {
  supabase.from.mockImplementation(() =>
    createQueryBuilder(
      null,
      {
        code: 'OTHER_ERROR',
      }
    )
  );

  renderPage();

  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: {
      value: 'user@test.com',
    },
  });

  fireEvent.change(screen.getByLabelText(/password/i), {
    target: {
      value: 'password123',
    },
  });

  fireEvent.click(
    screen.getByRole('button', {
      name: /^sign in$/i,
    })
  );

  expect(
    await screen.findByText(/could not determine user role/i)
  ).toBeInTheDocument();
});

test('google sign in works', async () => {
  renderPage();

  const googleButton = screen.getByRole('button', {
    name: /continue with google/i,
  });

  fireEvent.click(googleButton);

  await waitFor(() => {
    expect(
      supabase.auth.signInWithOAuth
    ).toHaveBeenCalled();
  });
});

test('google sign in shows error', async () => {
  supabase.auth.signInWithOAuth.mockResolvedValue({
    error: {
      message: 'Google auth failed',
    },
  });

  renderPage();

  const googleButton = screen.getByRole('button', {
    name: /continue with google/i,
  });

  fireEvent.click(googleButton);

  expect(
    await screen.findByText(/google auth failed/i)
  ).toBeInTheDocument();
});

test('forgot password link exists', () => {
  renderPage();

  expect(
    screen.getByText(/forgot password/i)
  ).toBeInTheDocument();
});

test('register link exists', () => {
  renderPage();

});

test('staff note renders', () => {
  renderPage();

  expect(
    screen.getByText(/municipal worker or administrator/i)
  ).toBeInTheDocument();
});