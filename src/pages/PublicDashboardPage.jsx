import MapPlaceholder from '../components/MapPlaceholder';

function PublicDashboardPage() {
  return (
    <article className="page-container">
      <header>
        <h1>Service Delivery Dashboard</h1>
        <p className="public-note" role="doc-subtitle">Public View • No Login Required</p>
      </header>

      {/* Stats Section */}
      <section className="stats-grid" aria-label="Service delivery statistics">
        <div className="stat-card open" role="status">
          <h2>Open Requests</h2>
          <div className="stat-number" aria-label="147 open requests">147</div>
        </div>
        <div className="stat-card resolved" role="status">
          <h2>Resolved This Month</h2>
          <div className="stat-number" aria-label="89 requests resolved">89</div>
        </div>
        <div className="stat-card time" role="status">
          <h2>Avg Response Time</h2>
          <div className="stat-number" aria-label="3.2 days average">3.2 days</div>
        </div>
      </section>

      {/* Map Section */}
      <section className="map-section" aria-label="Ward boundary map">
        <h2>Ward Boundary Map</h2>
        <figure>
          <MapPlaceholder />
          <figcaption className="map-data-source">
            🗺️ Ward boundary data sourced from: South African Municipal Demarcation Board (MDB) 2024
            <br />
            📍 Currently viewing: City of Johannesburg Metropolitan Municipality • Ward 58
          </figcaption>
        </figure>
      </section>

      {/* Activity Feed */}
      <section className="recent-activity" aria-label="Recent service reports">
        <h2>Recent Reports</h2>
        <ul className="activity-list">
          <li className="activity-item">
            <span className="category pothole">🕳️ Pothole</span>
            <span className="location">Braamfontein, Jorissen Street</span>
            <time className="time" dateTime="2026-04-11T10:00">10 minutes ago</time>
          </li>
          <li className="activity-item">
            <span className="category water">💧 Burst Pipe</span>
            <span className="location">Soweto, Vilakazi Street</span>
            <time className="time" dateTime="2026-04-11T09:35">25 minutes ago</time>
          </li>
          <li className="activity-item">
            <span className="category power">⚡ Power Outage</span>
            <span className="location">Alexandra, 2nd Avenue</span>
            <time className="time" dateTime="2026-04-11T09:00">1 hour ago</time>
          </li>
          <li className="activity-item">
            <span className="category waste">🗑️ Illegal Dumping</span>
            <span className="location">Diepsloot, Ingonyama Road</span>
            <time className="time" dateTime="2026-04-11T08:00">2 hours ago</time>
          </li>
        </ul>
      </section>
    </article>
  );
}

export default PublicDashboardPage;