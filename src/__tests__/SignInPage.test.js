import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  MemoryRouter: ({ children }) => children,
  BrowserRouter: ({ children }) => children,
  Link: () => null,
  NavLink: () => null,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
}));

jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(),
  },
}));

import SignInPage from '../pages/SignInPage';

describe('SignInPage', () => {
  test('renders sign in page', () => {
    render(<SignInPage />);
    expect(screen.getByText(/sign in|login|welcome/i)).toBeInTheDocument();
  });
});