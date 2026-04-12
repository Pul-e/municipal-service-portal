function AdminDashboardPage() {
  return (
    <article className="page-container">
      <header>
        <h1>Admin Dashboard</h1>
        <p>System Administrator • All Wards</p>
      </header>

      <section className="admin-stats">
        <div className="stat-card">247 Total Users</div>
        <div className="stat-card">1,423 Total Requests</div>
        <div className="stat-card">89% Resolution Rate</div>
      </section>

      <section className="admin-actions">
        <h2>Management</h2>
        <button>Manage Users</button>
        <button>View All Reports</button>
        <button>Assign Workers</button>
      </section>
    </article>
  );
}

export default AdminDashboardPage;