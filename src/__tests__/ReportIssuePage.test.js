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
        data: { user: { id: 'user-1' } },
      }),
    },
  },
}));

import ReportIssuePage from '../pages/ReportIssuePage';

describe('ReportIssuePage', () => {
  test('renders report issue page', () => {
    render(<ReportIssuePage />);
    expect(screen.getByText(/report|issue|submit/i)).toBeInTheDocument();
  });
});