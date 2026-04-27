import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import InteractiveMap from '../components/InteractiveMap';

const CATEGORY_ICONS = {
  pothole: '🕳️',
  'burst-pipe': '💧',
  'power-outage': '⚡',
  'illegal-dumping': '🗑️',
  'street-light': '💡',
  other: '📋',
};

function timeAgo(dateStr) {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function PublicDashboardPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [reportMarkers, setReportMarkers] = useState([]);

  useEffect(() => {
    async function fetchRequests() {
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, category, location, status, created_at, municipality, ward')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching requests:', error.message);
      } else {
        setRequests(data || []);
      }
      setLoading(false);
    }

    fetchRequests();
  }, []);

    // Fetch all reports with coordinates to show as coloured markers on the map
  useEffect(() => {
    const fetchReportMarkers = async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, status, location_point')
        .not('location_point', 'is', null);

      if (error) {
        console.error('Error fetching report markers:', error);
        return;
      }

            const markers = data
        .map(req => {
          let lat = null, lng = null;
          
          // Case 1: location_point is a string in WKT format "POINT(lng lat)"
          if (typeof req.location_point === 'string') {
            const match = req.location_point.match(/POINT\(([-\d.]+) ([-+\d.]+)\)/);
            if (match) {
              lng = parseFloat(match[1]);
              lat = parseFloat(match[2]);
            }
          } 
          // Case 2: location_point is a GeoJSON object
          else if (req.location_point && typeof req.location_point === 'object') {
            if (req.location_point.type === 'Point' && req.location_point.coordinates) {
              lng = req.location_point.coordinates[0];
              lat = req.location_point.coordinates[1];
            }
          }
          
          if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
            return {
              id: req.id,
              lat,
              lng,
              status: req.status
            };
          }
          return null;
        })
        .filter(Boolean);

      setReportMarkers(markers);
    };

    fetchReportMarkers();
  }, []);

  // For now, use hardcoded stats until you have the actual data
  const openCount = requests.filter(r => r.status !== 'Resolved').length;
  const resolvedCount = requests.filter(r => r.status === 'Resolved').length;

  // Handle map clicks (optional - for public dashboard, maybe just show info)
  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    console.log('User clicked on map:', location);
    // You could show a popup or filter requests near this location
  };

  return (
    <article className="page-container public-dashboard">
      <header className="dashboard-header">
        <h1>🏛️ Municipal Connect</h1>
        <p className="tagline">Report service issues in your ward. Track resolutions. Hold municipalities accountable.</p>
      </header>

      {/* Hero Stats - pulled from Supabase */}
      <section className="stats-compact" aria-label="Service delivery statistics">
        <div className="stat-item">
          <span className="stat-value">{loading ? '...' : openCount}</span>
          <span className="stat-label">Open Requests</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{loading ? '...' : resolvedCount}</span>
          <span className="stat-label">Resolved This Month</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">3.2d</span>
          <span className="stat-label">Avg Response</span>
        </div>
      </section>

      {/* Interactive Map Section - REPLACED MapPlaceholder */}
      <section className="map-section-large" aria-label="Ward boundary map">
        <h2>Service Delivery Map</h2>
        <p className="map-context">City of Johannesburg • Ward 58</p>
        <figure className="large-map-container">
          <InteractiveMap onLocationSelect={() => {}} markers={reportMarkers} />
          <figcaption className="map-data-source">
            <strong>Data Source:</strong> South African Municipal Demarcation Board (MDB) 2024
            <br />
            <span style={{ fontSize: '12px' }}>📍 Click anywhere on the map to explore your area</span>
          </figcaption>
        </figure>
        {selectedLocation && (
          <div className="selected-location-info" style={{ marginTop: '8px', fontSize: '12px', textAlign: 'center', color: '#666' }}>
            Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
          </div>
        )}
      </section>

      {/* Recent Activity Feed - live from Supabase */}
      <section className="recent-activity-compact" aria-label="Recent reports">
        <h3>Recent Reports in Your Area</h3>

        {loading ? (
          <p style={{ color: '#888', padding: '1rem 0' }}>Loading reports...</p>
        ) : requests.length === 0 ? (
          <p style={{ color: '#888', padding: '1rem 0' }}>No reports yet. Be the first to report an issue.</p>
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