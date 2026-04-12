import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import StatusBadge from '../components/StatusBadge';

function timeAgo(dateStr) {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    async function fetchMyRequests() {
      // Get the currently logged-in user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error.message);
      } else {
        setRequests(data || []);
      }
      setLoading(false);
    }

    fetchMyRequests();
  }, []);

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
        {loading ? (
          <p style={{ color: '#888', padding: '2rem 0', textAlign: 'center' }}>Loading your requests...</p>
        ) : filteredRequests.length > 0 ? (
          <ul className="requests-list" aria-label="Your service requests">
            {filteredRequests.map((request) => (
              <li key={request.id}>
                <article className="request-card">
                  <header className="request-header">
                    <h2 className="request-category">{request.category}</h2>
                    <StatusBadge status={request.status} />
                  </header>

                  <address className="request-location">
                    📍 {request.location || 'Location not specified'}
                  </address>

                  <footer className="request-footer">
                    <time dateTime={request.created_at} className="request-date">
                      📅 Reported {timeAgo(request.created_at)}
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
