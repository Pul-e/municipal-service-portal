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
    from: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'resident-1' } },
      }),
    },
  },
}));

import MyRequestsPage from '../pages/MyRequestsPage';

describe('MyRequestsPage', () => {
  test('renders my requests page', () => {
    render(<MyRequestsPage />);
    expect(screen.getByText(/my requests|requests|status/i)).toBeInTheDocument();
  });
});