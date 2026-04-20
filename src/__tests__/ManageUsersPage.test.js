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
        data: { user: { id: 'admin-1' } },
      }),
    },
  },
}));

import ManageUsersPage from '../pages/admin/ManageUsersPage';

describe('ManageUsersPage', () => {
  test('renders manage users page', () => {
    render(<ManageUsersPage />);
    expect(screen.getByText(/manage|users|role|admin/i)).toBeInTheDocument();
  });
});