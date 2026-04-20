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
        data: { user: { id: 'worker-1' } },
      }),
    },
  },
}));

import WorkerDashboardPage from '../pages/WorkerDashboardPage';

describe('WorkerDashboardPage', () => {
  test('renders worker dashboard page', () => {
    render(<WorkerDashboardPage />);
    expect(screen.getByText(/worker|dashboard|request|status/i)).toBeInTheDocument();
  });
});