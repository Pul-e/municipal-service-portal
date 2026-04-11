import { useState } from 'react';
import StatusBadge from '../components/StatusBadge';

function MyRequestsPage() {
  const [activeFilter, setActiveFilter] = useState('all');

  // Sample data - hardcoded for Sprint 1
  const requests = [
    {
      id: 1,
      category: 'Pothole',
      location: 'Main Road, Braamfontein',
      status: 'Acknowledged',
      date: '2026-04-09',
      dateDisplay: '2 days ago',
    },
    {
      id: 2,
      category: 'Burst Pipe',
      location: 'Park Street, Soweto',
      status: 'In Progress',
      date: '2026-04-06',
      dateDisplay: '5 days ago',
    },
    {
      id: 3,
      category: 'Illegal Dumping',
      location: 'Station Road, Alexandra',
      status: 'Resolved',
      date: '2026-04-01',
      dateDisplay: '10 days ago',
    },
  ];

  const filteredRequests = requests.filter((req) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'open') return req.status !== 'Resolved';
    if (activeFilter === 'resolved') return req.status === 'Resolved';
    return true;
  });

  const openCount = requests.filter(r => r.status !== 'Resolved').length;
  const resolvedCount = requests.filter(r => r.status === 'Resolved').length;

  return (
    <article className="page-container">
      <header>
        <h1>My Service Requests</h1>
        <p className="page-subtitle" role="doc-subtitle">
          Track and manage your reported municipal issues
        </p>
      </header>

      {/* Filter Navigation */}
      <nav className="filter-tabs" aria-label="Filter service requests">
        <ul role="tablist">
          <li role="presentation">
            <button
              role="tab"
              aria-selected={activeFilter === 'all'}
              aria-controls="requests-panel"
              className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Requests <span className="count">{requests.length}</span>
            </button>
          </li>
          <li role="presentation">
            <button
              role="tab"
              aria-selected={activeFilter === 'open'}
              aria-controls="requests-panel"
              className={`filter-tab ${activeFilter === 'open' ? 'active' : ''}`}
              onClick={() => setActiveFilter('open')}
            >
              Open <span className="count">{openCount}</span>
            </button>
          </li>
          <li role="presentation">
            <button
              role="tab"
              aria-selected={activeFilter === 'resolved'}
              aria-controls="requests-panel"
              className={`filter-tab ${activeFilter === 'resolved' ? 'active' : ''}`}
              onClick={() => setActiveFilter('resolved')}
            >
              Resolved <span className="count">{resolvedCount}</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Requests List */}
      <section 
        id="requests-panel"
        role="tabpanel"
        aria-label={`${activeFilter} service requests`}
      >
        {filteredRequests.length > 0 ? (
          <ul className="requests-list" aria-label="Your service requests">
            {filteredRequests.map((request) => (
              <li key={request.id}>
                <article className="request-card">
                  <header className="request-header">
                    <h2 className="request-category">{request.category}</h2>
                    <StatusBadge status={request.status} />
                  </header>
                  
                  <address className="request-location">
                    📍 {request.location}
                  </address>
                  
                  <footer className="request-footer">
                    <time dateTime={request.date} className="request-date">
                      📅 Reported {request.dateDisplay}
                    </time>
                    <button 
                      className="view-details-btn"
                      aria-label={`View details for ${request.category} at ${request.location}`}
                    >
                      View Details →
                    </button>
                  </footer>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-requests" role="status" aria-live="polite">
            <p>No requests found.</p>
          </div>
        )}
      </section>

      {/* Help Section */}
      <aside className="help-section" aria-label="Help and information">
        <h3>Need Help?</h3>
        <p>If your issue hasn't been addressed, you can:</p>
        <ul>
          <li>📞 Call our helpline: 0800 123 456</li>
          <li>📧 Email: support@municipalconnect.co.za</li>
          <li>🏢 Visit your nearest municipal office</li>
        </ul>
      </aside>
    </article>
  );
}

export default MyRequestsPage;