import { render, screen } from '@testing-library/react';
import StatusBadge from '../components/StatusBadge';

describe('StatusBadge', () => {
  test('renders acknowledged status correctly', () => {
    render(<StatusBadge status="Acknowledged" />);

    expect(screen.getByText('Acknowledged')).toBeInTheDocument();

    expect(screen.getByRole('status')).toHaveClass(
      'status-acknowledged'
    );

    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Request has been received and acknowledged'
    );
  });

  test('renders in progress status correctly', () => {
    render(<StatusBadge status="In Progress" />);

    expect(screen.getByRole('status')).toHaveClass(
      'status-progress'
    );

    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Work is currently in progress'
    );
  });

  test('renders resolved status correctly', () => {
    render(<StatusBadge status="Resolved" />);

    expect(screen.getByRole('status')).toHaveClass(
      'status-resolved'
    );

    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Issue has been resolved'
    );
  });

  test('renders assigned status correctly', () => {
    render(<StatusBadge status="Assigned" />);

    expect(screen.getByRole('status')).toHaveClass(
      'status-assigned'
    );

    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Request assigned to a worker'
    );
  });

  test('renders default status correctly', () => {
    render(<StatusBadge status="Pending" />);

    expect(screen.getByRole('status')).toHaveClass(
      'status-default'
    );

    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Status: Pending'
    );
  });
});