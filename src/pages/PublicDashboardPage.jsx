import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import InteractiveMap from '../components/InteractiveMap';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const CATEGORY_ICONS = {
  pothole: '⬛',
  'burst-pipe': '💧',
  'power-outage': '⚡',
  'illegal-dumping': '🗑',
  'street-light': '💡',
  other: '📋',
};

function timeAgo(dateStr) {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function PublicDashboardPage() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ open: 0, resolved: 0, avgResponse: '...' });
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const { data, error } = await supabase
          .from('service_requests')
          .select('id, category, location, location_point, status, created_at')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setRequests(data || []);

        const open = (data || []).filter(r => r.status !== 'Resolved').length;
        const resolved = (data || []).filter(r => r.status === 'Resolved').length;

        let avgResponse = 'N/A';
        try {
          const res = await fetch(`${API_BASE}/api/analytics/resolution-times`);
          if (res.ok) {
            const resolutionData = await res.json();
            avgResponse = resolutionData.overall_average_hours
              ? `${resolutionData.overall_average_hours}h`
              : 'N/A';
          }
        } catch {
          avgResponse = 'N/A';
        }

        setStats({ open, resolved, avgResponse });

        const markers = (data || [])
          .filter(r => r.location_point)
          .map(r => {
            const match = r.location_point?.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
            if (match) {
              return {
                id: r.id,
                lat: parseFloat(match[2]),
                lng: parseFloat(match[1]),
                category: r.category,
                status: r.status,
              };
            }
            return null;
          })
          .filter(Boolean);

        setMapMarkers(markers);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
  };

  return (
    <article className="page-container public-dashboard">
      {/* Hero Header */}
      <header className="dashboard-header">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mc-accent)', marginBottom: '8px' }}>
            City of Johannesburg · Ward 58
          </p>
          <h1>
            Municipal <strong>Connect</strong>
          </h1>
          <p className="tagline">
            Report service issues in your ward. Track resolutions. Hold municipalities accountable.
          </p>
        </div>
      </header>

      {/* Stats Strip */}
      <section className="stats-compact" aria-label="Service delivery statistics">
        <div className="stat-item">
          <span className="stat-value">{loading ? '—' : stats.open}</span>
          <span className="stat-label">Open Requests</span>
        </div>
        <div className="stat-item">
          <span className="stat-value" style={{ color: 'var(--mc-accent)' }}>
            {loading ? '—' : stats.resolved}
          </span>
          <span className="stat-label">Resolved</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{loading ? '—' : stats.avgResponse}</span>
          <span className="stat-label">Avg Response</span>
        </div>
      </section>

      {/* Map Section */}
      <section className="map-section-large" aria-label="Ward boundary map" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
        <h2>Service Delivery Map</h2>
        <p className="map-context">
          City of Johannesburg • Ward 58
          {mapMarkers.length > 0 && (
            <span className="marker-count"> · {mapMarkers.length} requests shown</span>
          )}
        </p>
        <figure className="large-map-container">
          <InteractiveMap
            onLocationSelect={handleLocationSelect}
            markers={mapMarkers}
          />
          <figcaption className="map-data-source">
            Data Source: South African Municipal Demarcation Board (MDB) 2024
          </figcaption>
        </figure>

        {selectedLocation && (
          <div className="selected-location-info">
            📍 Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
          </div>
        )}

        {mapMarkers.length > 0 && (
          <div className="map-legend">
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#d97706' }}></span> Acknowledged
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#2176ae' }}></span> In Progress
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#2d6a4f' }}></span> Resolved
            </span>
          </div>
        )}
      </section>

      {/* Recent Reports */}
      <section
        className="recent-activity-compact"
        aria-label="Recent reports"
        style={{ marginLeft: '2rem', marginRight: '2rem', marginTop: '1.5rem' }}
      >
        <h3>Recent Reports in Your Area</h3>

        {loading ? (
          <p className="loading-text" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--mc-muted)', fontSize: '0.875rem' }}>
            Loading reports...
          </p>
        ) : requests.length === 0 ? (
          <p className="empty-state" style={{ padding: '1.5rem', textAlign: 'center' }}>
            No reports yet. Be the first to report an issue.
          </p>
        ) : (
          <ul className="activity-list-compact">
            {requests.map((req) => (
              <li key={req.id}>
                <span className="category-icon">
                  {CATEGORY_ICONS[req.category] || '📋'}
                </span>
                <span className="activity-detail">
                  <span className="activity-category">{req.category}</span>
                  {' — '}
                  <span style={{ color: 'var(--mc-muted)', fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>
                    {req.location || 'Location not specified'}
                  </span>
                </span>
                <span className="activity-time">{timeAgo(req.created_at)}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="signin-prompt">
          <a href="/signin" className="text-link">Sign in</a> to report an issue or track your requests.
        </p>
      </section>
    </article>
  );
}

export default PublicDashboardPage;