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
      // Report 1: Request Volume (from Supabase directly)
      const { data: requests, error: reqError } = await supabase
        .from('service_requests')
        .select('category, status, created_at');

      if (reqError) throw reqError;

      // Process volume data
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

      // Report 2: Resolution Times
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

      // Report 3: Worker Performance
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
        <p className="loading-text">Loading reports...</p>
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
        <div className="error-message" role="alert" style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <nav className="report-tabs" aria-label="Analytics reports" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #ddd' }}>
        <button
          className={`report-tab ${activeReport === 'volume' ? 'active' : ''}`}
          onClick={() => setActiveReport('volume')}
          style={{ padding: '0.75rem 1.5rem', background: activeReport === 'volume' ? '#007bff' : '#f0f0f0', color: activeReport === 'volume' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer' }}
        >
          📈 Request Volume
        </button>
        <button
          className={`report-tab ${activeReport === 'resolution' ? 'active' : ''}`}
          onClick={() => setActiveReport('resolution')}
          style={{ padding: '0.75rem 1.5rem', background: activeReport === 'resolution' ? '#007bff' : '#f0f0f0', color: activeReport === 'resolution' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer' }}
        >
          ⏱️ Resolution Times
        </button>
        <button
          className={`report-tab ${activeReport === 'worker' ? 'active' : ''}`}
          onClick={() => setActiveReport('worker')}
          style={{ padding: '0.75rem 1.5rem', background: activeReport === 'worker' ? '#007bff' : '#f0f0f0', color: activeReport === 'worker' ? 'white' : '#333', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer' }}
        >
          👷 Worker Performance
        </button>
      </nav>

      <div className="export-actions" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', justifyContent: 'flex-end' }}>
        <button
          className="export-btn csv"
          onClick={() => handleExportCSV(
            activeReport === 'volume' ? 'request-volume' :
            activeReport === 'resolution' ? 'resolution-times' : 'worker-performance'
          )}
          style={{ padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          📥 Export CSV
        </button>
        <button
          className="export-btn pdf"
          onClick={handleExportPDF}
          style={{ padding: '0.5rem 1rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          🖨️ Export PDF
        </button>
      </div>

      {activeReport === 'volume' && volumeData && (
        <section className="report-section" aria-label="Request volume report" style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2>Request Volume Analysis</h2>
          
          <div className="report-stats" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="report-stat-card" style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <span className="report-stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', display: 'block' }}>{volumeData.total_requests}</span>
              <span className="report-stat-label">Total Requests</span>
            </div>
            <div className="report-stat-card" style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <span className="report-stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', display: 'block' }}>{Object.keys(volumeData.by_category || {}).length}</span>
              <span className="report-stat-label">Categories</span>
            </div>
          </div>

          <div className="chart-section" style={{ marginBottom: '1.5rem' }}>
            <h3>By Category</h3>
            <div className="bar-chart">
              {Object.entries(volumeData.by_category || {}).map(([category, count]) => {
                const maxVal = Math.max(...Object.values(volumeData.by_category));
                const width = (count / maxVal) * 100;
                return (
                  <div key={category} className="bar-row" style={{ marginBottom: '0.5rem' }}>
                    <span className="bar-label" style={{ display: 'inline-block', width: '120px' }}>{category}</span>
                    <div className="bar-track" style={{ display: 'inline-block', width: 'calc(100% - 130px)', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                      <div className="bar-fill" style={{ width: `${width}%`, background: '#007bff', height: '24px', lineHeight: '24px', color: 'white', paddingLeft: '8px' }}>
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
            <div className="status-grid" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {Object.entries(volumeData.by_status || {}).map(([status, count]) => (
                <div key={status} className="status-card" style={{ flex: 1, minWidth: '100px', textAlign: 'center', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px' }}>
                  <span className="status-count" style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'block' }}>{count}</span>
                  <span className="status-name">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeReport === 'resolution' && resolutionData && (
        <section className="report-section" aria-label="Resolution time report" style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2>Resolution Time Analysis</h2>
          
          <div className="report-stats" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="report-stat-card" style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <span className="report-stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', display: 'block' }}>{resolutionData.total_resolved}</span>
              <span className="report-stat-label">Total Resolved</span>
            </div>
            <div className="report-stat-card highlight" style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#28a745', color: 'white', borderRadius: '8px' }}>
              <span className="report-stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', display: 'block' }}>{resolutionData.overall_average_hours}h</span>
              <span className="report-stat-label">Avg Resolution Time</span>
            </div>
          </div>

          <div className="chart-section">
            <h3>Average Resolution Time by Category</h3>
            <div className="bar-chart">
              {Object.entries(resolutionData.by_category || {}).map(([category, data]) => {
                const maxHours = Math.max(...Object.values(resolutionData.by_category).map(d => d.average_hours), 1);
                const width = (data.average_hours / maxHours) * 100;
                return (
                  <div key={category} className="bar-row" style={{ marginBottom: '0.5rem' }}>
                    <span className="bar-label" style={{ display: 'inline-block', width: '120px' }}>{category}</span>
                    <div className="bar-track" style={{ display: 'inline-block', width: 'calc(100% - 200px)', background: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
                      <div className="bar-fill resolution-bar" style={{ width: `${width}%`, background: '#28a745', height: '24px', lineHeight: '24px', color: 'white', paddingLeft: '8px' }}>
                        <span className="bar-value">{data.average_hours}h</span>
                      </div>
                    </div>
                    <span className="bar-extra" style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#666' }}>({data.count} resolved)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {activeReport === 'worker' && workerData && (
        <section className="report-section" aria-label="Worker performance report" style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2>Worker Performance</h2>
          
          <div className="report-stats" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="report-stat-card" style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <span className="report-stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', display: 'block' }}>{workerData.workers?.length || 0}</span>
              <span className="report-stat-label">Active Workers</span>
            </div>
            <div className="report-stat-card" style={{ flex: 1, textAlign: 'center', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <span className="report-stat-value" style={{ fontSize: '2rem', fontWeight: 'bold', display: 'block' }}>
                {workerData.workers?.reduce((sum, w) => sum + w.resolved_requests, 0) || 0}
              </span>
              <span className="report-stat-label">Total Resolved</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="users-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Rank</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Worker Name</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Resolved</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Avg Resolution Time</th>
                </tr>
              </thead>
              <tbody>
                {workerData.workers?.map((worker, index) => (
                  <tr key={worker.staff_id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '0.5rem' }}>
                      <span className={`rank-badge rank-${index + 1}`} style={{ 
                        background: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#f8f9fa',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                      }}>
                        #{index + 1}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem' }}>{worker.name}</td>
                    <td style={{ padding: '0.5rem' }}>{worker.resolved_requests}</td>
                    <td style={{ padding: '0.5rem' }}>{worker.average_resolution_hours}h</td>
                  </tr>
                ))}
                {(!workerData.workers || workerData.workers.length === 0) && (
                  <tr>
                    <td colSpan="4" className="empty-state" style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>No worker data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="refresh-section" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <button className="secondary-btn" onClick={fetchAllReports} style={{ padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          🔄 Refresh Reports
        </button>
      </div>

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