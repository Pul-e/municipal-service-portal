import MapPlaceholder from '../components/MapPlaceholder';

function PublicDashboardPage() {
  return (
    <article className="page-container public-dashboard">
      <header className="dashboard-header">
        <h1>🏛️ Municipal Connect</h1>
        <p className="tagline">Report service issues in your ward. Track resolutions. Hold municipalities accountable.</p>
      </header>

      {/* Hero Stats - Compact */}
      <section className="stats-compact" aria-label="Service delivery statistics">
        <div className="stat-item">
          <span className="stat-value">147</span>
          <span className="stat-label">Open Requests</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">89</span>
          <span className="stat-label">Resolved This Month</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">3.2d</span>
          <span className="stat-label">Avg Response</span>
        </div>
      </section>

      {/* Large Map Section */}
      <section className="map-section-large" aria-label="Ward boundary map">
        <h2>Service Delivery Map</h2>
        <p className="map-context">City of Johannesburg • Ward 58</p>
        
        <figure className="large-map-container">
          <MapPlaceholder />
          <figcaption className="map-data-source">
            <strong>Data Source:</strong> South African Municipal Demarcation Board (MDB) 2024
          </figcaption>
        </figure>
      </section>

      {/* Recent Activity Feed */}
      <section className="recent-activity-compact" aria-label="Recent reports">
        <h3>Recent Reports in Your Area</h3>
        <ul className="activity-list-compact">
          <li>
            <span className="category-icon">🕳️</span>
            <span className="activity-detail">Pothole reported on Jorissen Street, Braamfontein</span>
            <span className="activity-time">10 minutes ago</span>
          </li>
          <li>
            <span className="category-icon">💧</span>
            <span className="activity-detail">Burst pipe at Vilakazi Street, Soweto</span>
            <span className="activity-time">25 minutes ago</span>
          </li>
          <li>
            <span className="category-icon">⚡</span>
            <span className="activity-detail">Power outage on 2nd Avenue, Alexandra</span>
            <span className="activity-time">1 hour ago</span>
          </li>
          <li>
            <span className="category-icon">🗑️</span>
            <span className="activity-detail">Illegal dumping on Ingonyama Road, Diepsloot</span>
            <span className="activity-time">2 hours ago</span>
          </li>
        </ul>
        <p className="signin-prompt">
          <a href="/signin" className="text-link">Sign in</a> to report an issue or track your requests.
        </p>
      </section>
    </article>
  );
}

export default PublicDashboardPage;