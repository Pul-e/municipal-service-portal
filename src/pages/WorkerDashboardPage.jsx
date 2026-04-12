import StatusBadge from '../components/StatusBadge';

function WorkerDashboardPage() {
  // Sample assigned requests
  const assignedRequests = [
    {
      id: 101,
      category: 'Pothole',
      location: 'Jorissen Street, Braamfontein',
      status: 'In Progress',
      priority: 'High',
      assignedDate: '2026-04-11',
    },
    {
      id: 102,
      category: 'Street Light',
      location: 'Empire Road, Parktown',
      status: 'Assigned',
      priority: 'Medium',
      assignedDate: '2026-04-10',
    },
    {
      id: 103,
      category: 'Burst Pipe',
      location: 'Main Road, Melville',
      status: 'In Progress',
      priority: 'Critical',
      assignedDate: '2026-04-11',
    },
  ];

  // Sample unassigned queue
  const unassignedRequests = [
    {
      id: 201,
      category: 'Water Leak',
      location: 'Vilakazi Street, Soweto',
      priority: 'Critical',
      reported: '2026-04-11T09:45',
      reportedDisplay: '15 min ago',
    },
    {
      id: 202,
      category: 'Illegal Dumping',
      location: 'Ingonyama Road, Diepsloot',
      priority: 'Low',
      reported: '2026-04-11T08:00',
      reportedDisplay: '2 hours ago',
    },
    {
      id: 203,
      category: 'Pothole',
      location: 'Rissik Street, CBD',
      priority: 'Medium',
      reported: '2026-04-11T07:30',
      reportedDisplay: '2.5 hours ago',
    },
    {
      id: 204,
      category: 'Power Outage',
      location: '4th Avenue, Alexandra',
      priority: 'High',
      reported: '2026-04-11T10:00',
      reportedDisplay: '5 min ago',
    },
  ];

  const workerName = 'Thabo Ndlovu';
  const workerZone = 'Zone 5';
  const workerRole = 'Senior Technician';

  return (
    <article className="page-container">
      <header>
        <h1>Municipal Worker Dashboard</h1>
        <div className="worker-info" role="doc-subtitle">
          <p>
            <strong>{workerName}</strong> • {workerZone} • {workerRole}
          </p>
        </div>
      </header>

      {/* Stats Summary */}
      <section className="worker-stats" aria-label="Workload summary">
        <dl className="stats-inline">
          <div>
            <dt>Assigned to me</dt>
            <dd>{assignedRequests.length}</dd>
          </div>
          <div>
            <dt>In queue</dt>
            <dd>{unassignedRequests.length}</dd>
          </div>
          <div>
            <dt>Completed today</dt>
            <dd>4</dd>
          </div>
        </dl>
      </section>

      {/* Assigned to Me Section */}
      <section className="dashboard-section" aria-labelledby="assigned-heading">
        <h2 id="assigned-heading">📋 Assigned to Me</h2>
        
        {assignedRequests.length > 0 ? (
          <ul className="worker-request-list" aria-label="Your assigned requests">
            {assignedRequests.map((req) => (
              <li key={req.id}>
                <article className="worker-request-card">
                  <header className="worker-request-header">
                    <h3 className="request-category">{req.category}</h3>
                    <span 
                      className={`priority-badge priority-${req.priority.toLowerCase()}`}
                      aria-label={`Priority: ${req.priority}`}
                    >
                      {req.priority}
                    </span>
                  </header>
                  
                  <address className="request-location">{req.location}</address>
                  
                  <footer className="worker-actions">
                    <StatusBadge status={req.status} />
                    <div className="action-buttons">
                      <button 
                        className="action-btn progress"
                        aria-label={`Mark ${req.category} as in progress`}
                      >
                        In Progress
                      </button>
                      <button 
                        className="action-btn resolve"
                        aria-label={`Mark ${req.category} as resolved`}
                      >
                        Resolved
                      </button>
                    </div>
                  </footer>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No requests assigned to you.</p>
        )}
      </section>

      {/* Unassigned Queue Section */}
      <section className="dashboard-section" aria-labelledby="queue-heading">
        <h2 id="queue-heading">⏳ Unassigned Queue</h2>
        <p className="section-description">
          Requests waiting to be claimed in {workerZone}
        </p>
        
        {unassignedRequests.length > 0 ? (
          <ul className="worker-request-list" aria-label="Unassigned requests in your zone">
            {unassignedRequests.map((req) => (
              <li key={req.id}>
                <article className="worker-request-card unassigned">
                  <header className="worker-request-header">
                    <h3 className="request-category">{req.category}</h3>
                    <span 
                      className={`priority-badge priority-${req.priority.toLowerCase()}`}
                      aria-label={`Priority: ${req.priority}`}
                    >
                      {req.priority}
                    </span>
                  </header>
                  
                  <address className="request-location">{req.location}</address>
                  
                  <footer className="worker-actions">
                    <time dateTime={req.reported} className="reported-time">
                      🕐 Reported {req.reportedDisplay}
                    </time>
                    <button 
                      className="action-btn claim"
                      aria-label={`Claim ${req.category} request at ${req.location}`}
                    >
                      Claim Request
                    </button>
                  </footer>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No requests in queue for your zone.</p>
        )}
      </section>

      {/* Performance Summary */}
      <aside className="performance-summary" aria-label="Your performance metrics">
        <h3>📊 Your Performance</h3>
        <dl className="metrics-grid">
          <div>
            <dt>This Week</dt>
            <dd>12 resolved</dd>
          </div>
          <div>
            <dt>Avg Response</dt>
            <dd>2.1 hours</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd>4.8 ⭐</dd>
          </div>
        </dl>
      </aside>
    </article>
  );
}

export default WorkerDashboardPage;