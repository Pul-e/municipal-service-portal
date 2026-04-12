import { Link } from 'react-router-dom';

function ResidentDashboardPage() {
  return (
    <article className="page-container">
      <header>
        <h1>Resident Dashboard</h1>
        <p>Welcome back, [Resident Name] • Ward 58</p>
      </header>

      <div className="dashboard-actions">
        <Link to="/resident/report" className="primary-action">
          📝 Report New Issue
        </Link>
        <Link to="/resident/my-requests" className="secondary-action">
          📋 View My Requests
        </Link>
      </div>

      <section className="quick-stats">
        <h2>Your Activity</h2>
        <div className="stats-row">
          <div className="stat-card">3 Open Requests</div>
          <div className="stat-card">7 Resolved</div>
          <div className="stat-card">Ward 58</div>
        </div>
      </section>

      <section className="recent-requests">
        <h2>Your Recent Requests</h2>
        <p>🕳️ Pothole on Main Road - In Progress</p>
        <p>💡 Street Light - Resolved</p>
      </section>
    </article>
  );
}

export default ResidentDashboardPage;