import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

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
      const { data: requests, error: reqError } = await supabase
        .from('service_requests')
        .select('category, status, created_at');

      if (reqError) throw reqError;

      const byCategory = {};
      const byStatus = {};
      const timeline = {};

      requests.forEach(request => {
        byCategory[request.category] = (byCategory[request.category] || 0) + 1;
        byStatus[request.status] = (byStatus[request.status] || 0) + 1;
        const date = request.created_at?.split('T')[0];
        if (date) timeline[date] = (timeline[date] || 0) + 1;
      });

      setVolumeData({
        total_requests: requests.length,
        by_category: byCategory,
        by_status: byStatus,
        daily_volume: timeline,
        generated_at: new Date().toISOString()
      });

      const { data: resolvedRequests, error: resError } = await supabase
        .from('service_requests')
        .select('category, resolution_time_minutes')
        .eq('status', 'Resolved')
        .not('resolution_time_minutes', 'is', null);

      if (resError) throw resError;

      const byCategoryRes = {};
      resolvedRequests.forEach(request => {
        if (!byCategoryRes[request.category]) {
          byCategoryRes[request.category] = { count: 0, total_minutes: 0 };
        }
        byCategoryRes[request.category].count++;
        byCategoryRes[request.category].total_minutes += request.resolution_time_minutes;
      });

      Object.keys(byCategoryRes).forEach(cat => {
        const avg = byCategoryRes[cat].total_minutes / byCategoryRes[cat].count;
        byCategoryRes[cat].average_hours = Math.round(avg / 60 * 10) / 10;
      });

      const overallAvg = resolvedRequests.length > 0
        ? resolvedRequests.reduce((sum, r) => sum + r.resolution_time_minutes, 0) / resolvedRequests.length
        : 0;

      setResolutionData({
        total_resolved: resolvedRequests.length,
        overall_average_hours: Math.round(overallAvg / 60 * 10) / 10,
        by_category: byCategoryRes,
        generated_at: new Date().toISOString()
      });

      const { data: assignments, error: assignError } = await supabase
        .from('service_request_assignments')
        .select(`
          staff_id,
          assigned_at,
          service_requests!inner (
            id,
            status,
            resolution_time_minutes
          )
        `)
        .eq('service_requests.status', 'Resolved');

      if (assignError) throw assignError;

      const staffIds = [...new Set(assignments.map(a => a.staff_id))];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', staffIds);

      if (profileError) throw profileError;

      const performance = {};
      assignments.forEach(assignment => {
        const staffId = assignment.staff_id;
        if (!performance[staffId]) {
          performance[staffId] = { resolved_count: 0, total_resolution_minutes: 0 };
        }
        performance[staffId].resolved_count++;
        performance[staffId].total_resolution_minutes +=
          assignment.service_requests.resolution_time_minutes || 0;
      });

      const results = profiles.map(profile => ({
        staff_id: profile.id,
        name: profile.full_name || 'Unknown',
        resolved_requests: performance[profile.id]?.resolved_count || 0,
        average_resolution_hours: performance[profile.id]
          ? Math.round((performance[profile.id].total_resolution_minutes /
             performance[profile.id].resolved_count) / 60 * 10) / 10
          : 0
      }));

      setWorkerData({
        workers: results.sort((a, b) => b.resolved_requests - a.resolved_requests),
        generated_at: new Date().toISOString()
      });

    } catch (err) {
      console.error('Analytics error:', err);
      setError('Failed to load analytics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = (reportType) => {
    let data = [];
    let headers = [];
    let filename = '';

    if (reportType === 'request-volume' && volumeData) {
      headers = ['Category', 'Count'];
      data = Object.entries(volumeData.by_category || {}).map(([cat, count]) => ({
        Category: cat,
        Count: count
      }));
      filename = `request-volume-${Date.now()}.csv`;
    } else if (reportType === 'resolution-times' && resolutionData) {
      headers = ['Category', 'Resolved Count', 'Avg Resolution (hours)'];
      data = Object.entries(resolutionData.by_category || {}).map(([cat, stats]) => ({
        Category: cat,
        'Resolved Count': stats.count,
        'Avg Resolution (hours)': stats.average_hours
      }));
      filename = `resolution-times-${Date.now()}.csv`;
    } else if (reportType === 'worker-performance' && workerData) {
      headers = ['Worker Name', 'Resolved Requests', 'Avg Resolution (hours)'];
      data = (workerData.workers || []).map(w => ({
        'Worker Name': w.name,
        'Resolved Requests': w.resolved_requests,
        'Avg Resolution (hours)': w.average_resolution_hours
      }));
      filename = `worker-performance-${Date.now()}.csv`;
    }

    if (data.length === 0) return;

    const csvRows = [headers.join(',')];
    data.forEach(row => {
      const values = headers.map(header => {
        let value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <article className="page-container">
        <h1>Analytics Dashboard</h1>
        <p className="loading-text" role="status">Loading reports...</p>
      </article>
    );
  }

  return (
    <article className="page-container">
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
          aria-pressed={activeReport === 'volume'}
        >
          📈 Request Volume
        </button>
        <button
          className={`report-tab ${activeReport === 'resolution' ? 'active' : ''}`}
          onClick={() => setActiveReport('resolution')}
          aria-pressed={activeReport === 'resolution'}
        >
          ⏱️ Resolution Times
        </button>
        <button
          className={`report-tab ${activeReport === 'worker' ? 'active' : ''}`}
          onClick={() => setActiveReport('worker')}
          aria-pressed={activeReport === 'worker'}
        >
          👷 Worker Performance
        </button>
      </nav>

      {/* Export Actions */}
      <div className="export-actions">
        <button
          className="export-btn csv"
          onClick={() => handleExportCSV(
            activeReport === 'volume' ? 'request-volume' :
            activeReport === 'resolution' ? 'resolution-times' : 'worker-performance'
          )}
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
          
          <dl className="report-stats">
            <div className="report-stat-card">
              <dt className="report-stat-label">Total Requests</dt>
              <dd className="report-stat-value">{volumeData.total_requests}</dd>
            </div>
            <div className="report-stat-card">
              <dt className="report-stat-label">Categories</dt>
              <dd className="report-stat-value">{Object.keys(volumeData.by_category || {}).length}</dd>
            </div>
          </dl>

          <figure className="chart-section">
            <figcaption>By Category</figcaption>
            <div className="bar-chart">
              {Object.entries(volumeData.by_category || {}).map(([category, count]) => {
                const maxVal = Math.max(...Object.values(volumeData.by_category));
                const width = (count / maxVal) * 100;
                return (
                  <div key={category} className="bar-row">
                    <span className="bar-label">{category}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${width}%` }}>
                        <span className="bar-value">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </figure>

          <figure className="chart-section">
            <figcaption>By Status</figcaption>
            <div className="status-grid">
              {Object.entries(volumeData.by_status || {}).map(([status, count]) => (
                <div key={status} className="status-card">
                  <output className="status-count">{count}</output>
                  <span className="status-name">{status}</span>
                </div>
              ))}
            </div>
          </figure>

          <footer className="report-timestamp">
            <time dateTime={volumeData.generated_at}>
              Generated: {new Date(volumeData.generated_at).toLocaleString()}
            </time>
          </footer>
        </section>
      )}

      {/* Report 2: Resolution Times */}
      {activeReport === 'resolution' && resolutionData && (
        <section className="report-section" aria-label="Resolution time report">
          <h2>Resolution Time Analysis</h2>
          
          <dl className="report-stats">
            <div className="report-stat-card">
              <dt className="report-stat-label">Total Resolved</dt>
              <dd className="report-stat-value">{resolutionData.total_resolved}</dd>
            </div>
            <div className="report-stat-card highlight">
              <dt className="report-stat-label">Avg Resolution Time</dt>
              <dd className="report-stat-value">{resolutionData.overall_average_hours}h</dd>
            </div>
          </dl>

          <figure className="chart-section">
            <figcaption>Average Resolution Time by Category</figcaption>
            <div className="bar-chart">
              {Object.entries(resolutionData.by_category || {}).map(([category, data]) => {
                const maxHours = Math.max(...Object.values(resolutionData.by_category).map(d => d.average_hours), 1);
                const width = (data.average_hours / maxHours) * 100;
                return (
                  <div key={category} className="bar-row">
                    <span className="bar-label">{category}</span>
                    <div className="bar-track">
                      <div className="bar-fill resolution-bar" style={{ width: `${width}%` }}>
                        <span className="bar-value">{data.average_hours}h</span>
                      </div>
                    </div>
                    <span className="bar-extra">({data.count} resolved)</span>
                  </div>
                );
              })}
            </div>
          </figure>

          <footer className="report-timestamp">
            <time dateTime={resolutionData.generated_at}>
              Generated: {new Date(resolutionData.generated_at).toLocaleString()}
            </time>
          </footer>
        </section>
      )}

      {/* Report 3: Worker Performance */}
      {activeReport === 'worker' && workerData && (
        <section className="report-section" aria-label="Worker performance report">
          <h2>Worker Performance</h2>
          
          <dl className="report-stats">
            <div className="report-stat-card">
              <dt className="report-stat-label">Active Workers</dt>
              <dd className="report-stat-value">{workerData.workers?.length || 0}</dd>
            </div>
            <div className="report-stat-card">
              <dt className="report-stat-label">Total Resolved</dt>
              <dd className="report-stat-value">
                {workerData.workers?.reduce((sum, w) => sum + w.resolved_requests, 0) || 0}
              </dd>
            </div>
          </dl>

          <figure className="table-responsive">
            <table className="users-table">
              <caption>Worker performance rankings</caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Worker Name</th>
                  <th scope="col">Resolved</th>
                  <th scope="col">Avg Resolution Time</th>
                </tr>
              </thead>
              <tbody>
                {workerData.workers?.map((worker, index) => (
                  <tr key={worker.staff_id}>
                    <td>
                      <output className={`rank-badge rank-${index + 1}`}>
                        #{index + 1}
                      </output>
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
          </figure>

          <footer className="report-timestamp">
            <time dateTime={workerData.generated_at}>
              Generated: {new Date(workerData.generated_at).toLocaleString()}
            </time>
          </footer>
        </section>
      )}

      <footer className="refresh-section">
        <button className="secondary-btn" onClick={fetchAllReports}>
          🔄 Refresh Reports
        </button>
      </footer>

      {/* Print styles */}
      <style>{`
        @media print {
          .back-btn, .report-tabs, .export-actions, .refresh-section {
            display: none !important;
          }
          .report-section {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </article>
  );
}

export default AnalyticsDashboardPage;