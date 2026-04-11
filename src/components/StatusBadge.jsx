function StatusBadge({ status }) {
  const getStatusClass = () => {
    switch (status.toLowerCase()) {
      case 'acknowledged':
        return 'status-acknowledged';
      case 'in progress':
        return 'status-progress';
      case 'resolved':
        return 'status-resolved';
      case 'assigned':
        return 'status-assigned';
      default:
        return 'status-default';
    }
  };

  const getAriaLabel = () => {
    switch (status.toLowerCase()) {
      case 'acknowledged':
        return 'Request has been received and acknowledged';
      case 'in progress':
        return 'Work is currently in progress';
      case 'resolved':
        return 'Issue has been resolved';
      case 'assigned':
        return 'Request assigned to a worker';
      default:
        return `Status: ${status}`;
    }
  };

  return (
    <output 
      className={`status-badge ${getStatusClass()}`}
      aria-label={getAriaLabel()}
      role="status"
    >
      {status}
    </output>
  );
}

export default StatusBadge;