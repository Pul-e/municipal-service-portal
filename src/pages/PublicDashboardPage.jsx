import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import InteractiveMap from '../components/InteractiveMap';

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
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [reportMarkers, setReportMarkers] = useState([]);
  const [avgResponseTime, setAvgResponseTime] = useState(null);
  const [openCount, setOpenCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);

  const isResolvedAndOld = (req) => {
  if (req.status !== 'Resolved') return false;
  if (!req.resolved_at) return false;
  const resolvedDate = new Date(req.resolved_at);
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  return resolvedDate < fiveDaysAgo;
};

  useEffect(() => {
    async function fetchRequests() {
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, category, location, status, created_at, resolved_at, municipality, ward')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching requests:', error.message);
      } else {
        // Filter out resolved reports older than 5 days
        const filteredData = data.filter(req => !isResolvedAndOld(req));
        setRequests(filteredData.slice(0, 10));
      }
    }
    fetchRequests();
  }, []);

  useEffect(() => {
    async function fetchCounts() {
      const { count: open, error: openErr } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'Resolved');
      if (!openErr) setOpenCount(open || 0);

      const { count: resolved, error: resolvedErr } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Resolved');
      if (!resolvedErr) setResolvedCount(resolved || 0);
    }
    fetchCounts();
  }, []);

  const fetchAvgResponseTime = async () => {
    const { data, error } = await supabase
      .from('service_requests')
      .select('created_at, resolved_at')
      .eq('status', 'Resolved')
      .not('resolved_at', 'is', null);

    if (error) {
      console.error('Error fetching response times:', error);
      return;
    }

    if (data.length === 0) {
      setAvgResponseTime(null);
      return;
    }

    let totalMinutes = 0;
    data.forEach(req => {
      const created = new Date(req.created_at);
      const resolved = new Date(req.resolved_at);
      const diffMinutes = (resolved - created) / (1000 * 60);
      totalMinutes += diffMinutes;
    });

    const avgMinutes = totalMinutes / data.length;
    const days = Math.floor(avgMinutes / (60 * 24));
    const hours = Math.floor((avgMinutes % (60 * 24)) / 60);
    const minutes = Math.floor(avgMinutes % 60);
    
    let displayValue = '';
    if (days > 0) displayValue += `${days}d `;
    if (hours > 0 || days > 0) displayValue += `${hours}h `;
    displayValue += `${minutes}min`;
    
    setAvgResponseTime(displayValue.trim());
  };

  useEffect(() => {
    const fetchReportMarkers = async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, status, location_point, resolved_at')
        .not('location_point', 'is', null);

      if (error) {
        console.error('Error fetching report markers:', error);
        return;
      }

      // Filter out resolved reports older than 3 days
      const filteredData = data.filter(req => !isResolvedAndOld(req));

      const markers = filteredData
        .map(req => {
          let lat = null, lng = null;
          if (typeof req.location_point === 'string') {
            const match = req.location_point.match(/POINT\(([-\d.]+) ([-+\d.]+)\)/);
            if (match) {
              lng = parseFloat(match[1]);
              lat = parseFloat(match[2]);
            }
          } else if (req.location_point && typeof req.location_point === 'object') {
            if (req.location_point.type === 'Point' && req.location_point.coordinates) {
              lng = req.location_point.coordinates[0];
              lat = req.location_point.coordinates[1];
            }
          }
          if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
            return { id: req.id, lat, lng, status: req.status };
          }
          return null;
        })
        .filter(Boolean);
      setReportMarkers(markers);
    };

    fetchReportMarkers();
    fetchAvgResponseTime();
    setLoading(false);
  }, []);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
  };

  return (
    <article className="page-container public-dashboard">
      {/* Hero Header */}
      <header className="dashboard-header">
        <div className="hero-content">
          <p className="hero-eyebrow">South Africa</p>
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
        <dl className="stats-dl">
          <div className="stat-item">
            <dt className="stat-label">Open Requests</dt>
            <dd className="stat-value">{loading ? '—' : openCount}</dd>
          </div>
          <div className="stat-item">
            <dt className="stat-label">Resolved</dt>
            <dd className="stat-value stat-value-accent">{loading ? '—' : resolvedCount}</dd>
          </div>
          <div className="stat-item">
            <dt className="stat-label">Avg Response</dt>
            <dd className="stat-value">{avgResponseTime || '—'}</dd>
          </div>
        </dl>
      </section>

      {/* Map Section */}
      <section className="map-section-large" aria-label="Ward boundary map">
        <h2>Service Delivery Map</h2>
        <p className="map-context">
          Explore service requests across South Africa
          {reportMarkers.length > 0 && (
            <span className="marker-count"> · {reportMarkers.length} requests shown</span>
          )}
        </p>
        <figure className="large-map-container">
          <InteractiveMap onLocationSelect={handleLocationSelect} markers={reportMarkers} />
          <figcaption className="map-data-source">
            <cite>Data Source: South African Municipal Demarcation Board (MDB) 2024</cite>
          </figcaption>
        </figure>

        {selectedLocation && (
          <output className="selected-location-info">
            📍 Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
          </output>
        )}

        {reportMarkers.length > 0 && (
          <div className="map-legend" aria-label="Map marker legend">
            <span className="legend-item">
              <span className="legend-dot legend-dot-warning"></span> Acknowledged/Pending
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-dot-info"></span> In Progress
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-dot-success"></span> Resolved
            </span>
          </div>
        )}
      </section>

      {/* Recent Reports */}
      <section className="recent-activity-compact" aria-label="Recent reports">
        <h3>Recent Reports in Your Area</h3>

        {loading ? (
          <p className="loading-text" role="status">Loading reports...</p>
        ) : requests.length === 0 ? (
          <p className="empty-state">No reports yet. Be the first to report an issue.</p>
        ) : (
          <ul className="activity-list-compact">
            {requests.map((req) => (
              <li key={req.id}>
                <span className="category-icon">
                  {CATEGORY_ICONS[req.category] || '📋'}
                </span>
                <span className="activity-detail">
                  {req.category} reported — {req.municipality || 'Unknown Municipality'}, {req.ward ? `Ward ${req.ward}` : 'Ward not specified'}
                </span>
                <time className="activity-time" dateTime={req.created_at}>{timeAgo(req.created_at)}</time>
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