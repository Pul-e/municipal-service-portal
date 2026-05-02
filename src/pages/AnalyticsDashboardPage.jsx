import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function AnalyticsDashboardPage() {
  const navigate = useNavigate();
  const [volumeData, setVolumeData] = useState(null);
  const [resolutionData, setResolutionData] = useState(null);
  const [workerData, setWorkerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeReport, setActiveReport] = useState('volume');

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = async () => {
    setLoading(true);
    setError('');

    try {
      const [volRes, resRes, workRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/request-volume`),
        fetch(`${API_BASE}/api/analytics/resolution-times`),
        fetch(`${API_BASE}/api/analytics/worker-performance`),
      ]);

      if (!volRes.ok || !resRes.ok || !workRes.ok) {
        throw new Error('Failed to fetch one or more reports');
      }

      setVolumeData(await volRes.json());
      setResolutionData(await resRes.json());
      setWorkerData(await workRes.json());
    } catch (err) {
      setError('Failed to load analytics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (reportType) => {
    try {
      window.open(`${API_BASE}/api/analytics/export/${reportType}`, '_blank');
    } catch (err) {
      setError('Failed to export: ' + err.message);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <article className="page-container">
        <h1>Analytics Dashboard</h1>
        <p className="loading-text">Loading reports...</p>
      </article>
    );
  }

  return (
    <article className="page-container">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
        ← Back to Admin Dashboard
      </button>

      <header className="page-header">
        <h1>📊 Analytics Dashboard</h1>
        <p className="page-subtitle">Service delivery insights and performance metrics</p>
      </header>

      {error && (
        <div className="error-message" role="alert">{error}</div>
      )}

      {/* Report Tabs */}
      <nav className="report-tabs" aria-label="Analytics reports">
        <button
          className={`report-tab ${activeReport === 'volume' ? 'active' : ''}`}
          onClick={() => setActiveReport('volume')}
        >
          📈 Request Volume
        </button>
        <button
          className={`report-tab ${activeReport === 'resolution' ? 'active' : ''}`}
          onClick={() => setActiveReport('resolution')}
        >
          ⏱️ Resolution Times
        </button>
        <button
          className={`report-tab ${activeReport === 'worker' ? 'active' : ''}`}
          onClick={() => setActiveReport('worker')}
        >
          👷 Worker Performance
        </button>
      </nav>

      {/* Export Buttons */}
      <div className="export-actions">
        <button
          className="export-btn csv"
          onClick={() => handleExportCSV(activeReport === 'volume' ? 'request-volume' : 'request-volume')}
        >
          📥 Export CSV
        </button>
        <button className="export-btn pdf" onClick={handleExportPDF}>
          🖨️ Export PDF
        </button>
      </div>

      {/* Report 1: Request Volume */}
      {activeReport === 'volume' && volumeData && (
        <section className="report-section" aria-label="Request volume report">
          <h2>Request Volume Analysis</h2>
          
          <div className="report-stats">
            <div className="report-stat-card">
              <span className="report-stat-value">{volumeData.total_requests}</span>
              <span className="report-stat-label">Total Requests</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-value">
                {Object.keys(volumeData.by_category || {}).length}
              </span>
              <span className="report-stat-label">Categories</span>
            </div>
          </div>

          <div className="chart-section">
            <h3>By Category</h3>
            <div className="bar-chart">
              {Object.entries(volumeData.by_category || {}).map(([category, count]) => {
                const maxVal = Math.max(...Object.values(volumeData.by_category));
                const width = (count / maxVal) * 100;
                return (
                  <div key={category} className="bar-row">
                    <span className="bar-label">{category}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${width}%` }}
                      >
                        <span className="bar-value">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="chart-section">
            <h3>By Status</h3>
            <div className="status-grid">
              {Object.entries(volumeData.by_status || {}).map(([status, count]) => (
                <div key={status} className="status-card">
                  <span className="status-count">{count}</span>
                  <span className="status-name">{status}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="report-timestamp">
            Generated: {new Date(volumeData.generated_at).toLocaleString()}
          </p>
        </section>
      )}

      {/* Report 2: Resolution Times */}
      {activeReport === 'resolution' && resolutionData && (
        <section className="report-section" aria-label="Resolution time report">
          <h2>Resolution Time Analysis</h2>
          
          <div className="report-stats">
            <div className="report-stat-card">
              <span className="report-stat-value">{resolutionData.total_resolved}</span>
              <span className="report-stat-label">Total Resolved</span>
            </div>
            <div className="report-stat-card highlight">
              <span className="report-stat-value">
                {resolutionData.overall_average_hours}h
              </span>
              <span className="report-stat-label">Avg Resolution Time</span>
            </div>
          </div>

          <div className="chart-section">
            <h3>Average Resolution Time by Category</h3>
            <div className="bar-chart">
              {Object.entries(resolutionData.by_category || {}).map(([category, data]) => {
                const maxHours = Math.max(
                  ...Object.values(resolutionData.by_category).map(d => d.average_hours)
                );
                const width = (data.average_hours / maxHours) * 100;
                return (
                  <div key={category} className="bar-row">
                    <span className="bar-label">{category}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill resolution-bar"
                        style={{ width: `${width}%` }}
                      >
                        <span className="bar-value">{data.average_hours}h</span>
                      </div>
                    </div>
                    <span className="bar-extra">({data.count} resolved)</span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="report-timestamp">
            Generated: {new Date(resolutionData.generated_at).toLocaleString()}
          </p>
        </section>
      )}

      {/* Report 3: Worker Performance */}
      {activeReport === 'worker' && workerData && (
        <section className="report-section" aria-label="Worker performance report">
          <h2>Worker Performance</h2>
          
          <div className="report-stats">
            <div className="report-stat-card">
              <span className="report-stat-value">{workerData.workers?.length || 0}</span>
              <span className="report-stat-label">Active Workers</span>
            </div>
            <div className="report-stat-card">
              <span className="report-stat-value">
                {workerData.workers?.reduce((sum, w) => sum + w.resolved_requests, 0) || 0}
              </span>
              <span className="report-stat-label">Total Resolved</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Worker Name</th>
                  <th>Resolved</th>
                  <th>Avg Resolution Time</th>
                </tr>
              </thead>
              <tbody>
                {workerData.workers?.map((worker, index) => (
                  <tr key={worker.staff_id}>
                    <td>
                      <span className={`rank-badge rank-${index + 1}`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td>{worker.name}</td>
                    <td>{worker.resolved_requests}</td>
                    <td>{worker.average_resolution_hours}h</td>
                  </tr>
                ))}
                {(!workerData.workers || workerData.workers.length === 0) && (
                  <tr>
                    <td colSpan="4" className="empty-state">No worker data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="report-timestamp">
            Generated: {new Date(workerData.generated_at).toLocaleString()}
          </p>
        </section>
      )}

      <div className="refresh-section">
        <button className="secondary-btn" onClick={fetchAllReports}>
          🔄 Refresh Reports
        </button>
      </div>
    </article>
  );
}

export default AnalyticsDashboardPage;