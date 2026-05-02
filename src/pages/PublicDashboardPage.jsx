import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import InteractiveMap from '../components/InteractiveMap';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

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
  const [stats, setStats] = useState({ open: 0, resolved: 0, avgResponse: '...' });
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch recent requests from Supabase
        const { data, error } = await supabase
          .from('service_requests')
          .select('id, category, location, location_point, status, created_at')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setRequests(data || []);

        // Calculate stats locally
        const open = (data || []).filter(r => r.status !== 'Resolved').length;
        const resolved = (data || []).filter(r => r.status === 'Resolved').length;

        // Try to get avg response time from backend
        let avgResponse = '...';
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

        // Build map markers from requests with location data
        const markers = (data || [])
          .filter(r => r.location_point)
          .map(r => {
            // Extract coordinates from POINT(lng lat) format
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Acknowledged': return '#f59e0b';
      case 'In Progress': return '#3b82f6';
      case 'Resolved': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <article className="page-container public-dashboard">
      <header className="dashboard-header">
        <h1>🏛️ Municipal Connect</h1>
        <p className="tagline">Report service issues in your ward. Track resolutions. Hold municipalities accountable.</p>
      </header>

      {/* Stats - Live from Supabase + Backend */}
      <section className="stats-compact" aria-label="Service delivery statistics">
        <div className="stat-item">
          <span className="stat-value">{loading ? '...' : stats.open}</span>
          <span className="stat-label">Open Requests</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{loading ? '...' : stats.resolved}</span>
          <span className="stat-label">Resolved</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{loading ? '...' : stats.avgResponse}</span>
          <span className="stat-label">Avg Response</span>
        </div>
      </section>

      {/* Interactive Map with Request Pins */}
      <section className="map-section-large" aria-label="Ward boundary map">
        <h2>Service Delivery Map</h2>
        <p className="map-context">
          City of Johannesburg • Ward 58
          {mapMarkers.length > 0 && (
            <span className="marker-count"> • {mapMarkers.length} requests shown</span>
          )}
        </p>
        <figure className="large-map-container">
          <InteractiveMap
            onLocationSelect={handleLocationSelect}
            markers={mapMarkers}
          />
          <figcaption className="map-data-source">
            <strong>Data Source:</strong> South African Municipal Demarcation Board (MDB) 2024
          </figcaption>
        </figure>
        {selectedLocation && (
          <div className="selected-location-info">
            📍 Selected: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
          </div>
        )}
        
        {/* Map Legend */}
        {mapMarkers.length > 0 && (
          <div className="map-legend">
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#f59e0b' }}></span> Acknowledged
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#3b82f6' }}></span> In Progress
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#10b981' }}></span> Resolved
            </span>
          </div>
        )}
      </section>

      {/* Recent Activity Feed */}
      <section className="recent-activity-compact" aria-label="Recent reports">
        <h3>Recent Reports in Your Area</h3>

        {loading ? (
          <p className="loading-text">Loading reports...</p>
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
                  <span className="activity-category">{req.category}</span>
                  {' — '}
                  {req.location || 'Location not specified'}
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