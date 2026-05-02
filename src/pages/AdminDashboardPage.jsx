import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function AdminDashboardPage() {
  const [requests, setRequests] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setUser(user);

        const [reqRes, staffRes] = await Promise.all([
          supabase.from('service_requests').select('*').order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, full_name, role').eq('role', 'staff'),
        ]);

        if (reqRes.error) throw reqRes.error;
        if (staffRes.error) throw staffRes.error;

        setRequests(reqRes.data || []);
        setStaffList(staffRes.data || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load admin dashboard.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAssign = async (requestId, staffId) => {
    try {
      if (!staffId) return;
      const { error } = await supabase.from('service_request_assignments').insert({
        request_id: requestId,
        staff_id: staffId,
        assigned_by: user?.id,
      });
      if (error) throw error;
      setRequests((prev) =>
        prev.map((req) => req.id === requestId ? { ...req, assigned: true } : req)
      );
    } catch (err) {
      console.error(err);
      setError('Failed to assign request.');
    }
  };

  const resolvedCount = requests.filter(r => r.status === 'Resolved').length;

  const filteredRequests = requests.filter(req => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'open') return req.status !== 'Resolved';
    if (activeFilter === 'resolved') return req.status === 'Resolved';
    return true;
  });

  const getStatusClass = (status) => {
    switch (status) {
      case 'Resolved': return 'status-resolved';
      case 'In Progress': return 'status-in-progress';
      case 'Acknowledged': return 'status-acknowledged';
      default: return 'status-submitted';
    }
  };

  if (loading) {
    return (
      <article className="page-container">
        <p className="loading-text">Loading admin dashboard...</p>
      </article>
    );
  }

  return (
    <article className="page-container">
      <header style={{ background: 'var(--mc-dark)', padding: '2rem 2rem 0', marginBottom: 0 }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mc-accent)', marginBottom: '6px' }}>
          System Administrator · All Wards
        </p>
        <h1 style={{ color: '#fff', fontWeight: 300, fontSize: '1.6rem' }}>
          Admin <strong style={{ fontWeight: 600 }}>Dashboard</strong>
        </h1>

        {/* Filter tabs inside dark header */}
        <div style={{ display: 'flex', gap: 0, marginTop: '1.5rem' }}>
          {['all', 'open', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '10px 20px',
                fontSize: '0.82rem',
                fontWeight: 400,
                color: activeFilter === f ? 'var(--mc-accent)' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                fontFamily: 'var(--font)',
                borderBottom: activeFilter === f ? '2px solid var(--mc-accent)' : '2px solid transparent',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {f === 'all' ? 'All Requests' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="error-message" style={{ margin: '1rem 2rem 0' }}>{error}</p>}

      {/* KPI Cards */}
      <section className="admin-stats" style={{ padding: '1.5rem 2rem' }}>
        <div className="stat-card">
          <span className="stat-label">Total Staff</span>
          <span className="stat-value">{staffList.length}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--mc-accent)', marginTop: '4px', display: 'block' }}>Active</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Requests</span>
          <span className="stat-value">{requests.length}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--mc-muted)', marginTop: '4px', display: 'block' }}>All time</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Resolved</span>
          <span className="stat-value">{resolvedCount}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--mc-muted)', marginTop: '4px', display: 'block' }}>
            {requests.length > 0 ? Math.round((resolvedCount / requests.length) * 100) : 0}% rate
          </span>
        </div>
      </section>

      {/* Requests Table */}
      <section className="dashboard-section" style={{ padding: '0 2rem 2rem' }}>
        <div style={{
          background: 'var(--mc-surface)',
          border: '1px solid var(--mc-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {/* Table header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 3fr 1fr 1fr',
            padding: '10px 18px',
            borderBottom: '1px solid var(--mc-border)',
            background: 'rgba(0,0,0,0.015)',
          }}>
            {['Issue Type', 'Location', 'Status', 'Assign'].map(h => (
              <span key={h} style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--mc-muted)' }}>
                {h}
              </span>
            ))}
          </div>

          {filteredRequests.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--mc-muted)', fontSize: '0.875rem' }}>
              No requests found.
            </p>
          ) : (
            filteredRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 3fr 1fr 1fr',
                  padding: '13px 18px',
                  borderBottom: '1px solid var(--mc-border)',
                  alignItems: 'center',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(82,183,136,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize', color: 'var(--mc-text)' }}>
                    {req.category}
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--mc-muted)', fontFamily: 'var(--mono)' }}>
                  {req.location}
                </div>
                <div>
                  <span className={`status-badge ${getStatusClass(req.status)}`}>
                    {req.status}
                  </span>
                </div>
                <div>
                  {!req.assigned ? (
                    <select
                      defaultValue=""
                      onChange={(e) => handleAssign(req.id, e.target.value)}
                      style={{
                        fontSize: '0.78rem',
                        padding: '5px 8px',
                        border: '1px solid var(--mc-border-md)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--mc-bg)',
                        color: 'var(--mc-text)',
                        fontFamily: 'var(--font)',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="" disabled>Assign to staff...</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--mc-success)', fontFamily: 'var(--mono)' }}>
                      Assigned ✓
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </article>
  );
}

export default AdminDashboardPage;