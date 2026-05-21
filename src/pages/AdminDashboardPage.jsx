import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function AdminDashboardPage() {
  const navigate = useNavigate();
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

        const { data: requestsData, error: reqError } = await supabase
          .from('service_requests')
          .select('*,  municipality, ward')
          .order('created_at', { ascending: false });
        if (reqError) throw reqError;

        const { data: staffData, error: staffError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('role', ['staff', 'worker']);
        if (staffError) throw staffError;
        setStaffList(staffData || []);

        const staffNameMap = new Map();
        if (staffData) {
          staffData.forEach(staff => {
            staffNameMap.set(staff.id, staff.full_name || staff.email || 'Unknown');
          });
        }

        const { data: allAssignments, error: assignError } = await supabase
          .from('service_request_assignments')
          .select('request_id, staff_id, assigned_at')
          .order('assigned_at', { ascending: false });
        if (assignError) throw assignError;

        const assignmentMap = new Map();
        allAssignments?.forEach(assign => {
          if (!assignmentMap.has(assign.request_id)) {
            const staffName = staffNameMap.get(assign.staff_id) || 'Unknown';
            assignmentMap.set(assign.request_id, {
              staff_id: assign.staff_id,
              staff_name: staffName
            });
          }
        });

        const mergedRequests = requestsData.map(req => {
          const lastAssign = assignmentMap.get(req.id);
          return {
            ...req,
            assigned: !!lastAssign,
            assigned_staff_id: lastAssign?.staff_id,
            assigned_staff_name: lastAssign?.staff_name
          };
        });

        setRequests(mergedRequests);
      } catch (err) {
        console.error(err);
        setError(`Error: ${err.message || 'Failed to load admin dashboard.'}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAssign = async (requestId, staffId) => {
    try {
      if (!staffId) return;
      const { error: assignError } = await supabase
        .from('service_request_assignments')
        .insert({
          request_id: requestId,
          staff_id: staffId,
          assigned_by: user?.id,
        });
      if (assignError) throw assignError;

      const assignedStaff = staffList.find(s => s.id === staffId);
      const staffName = assignedStaff?.full_name || assignedStaff?.email || 'Worker';

      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? {
                ...req,
                assigned: true,
                assigned_staff_id: staffId,
                assigned_staff_name: staffName,
                status: 'Assigned'
              }
            : req
        )
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
      <header className="admin-header">
        <p className="admin-role-label">System Administrator · All Wards</p>
        <h1>
        <strong>Admin</strong> <strong>Dashboard</strong>
        </h1>

        <nav className="admin-filter-tabs" aria-label="Filter service requests by status">
          {['all', 'open', 'resolved'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`admin-filter-btn ${activeFilter === f ? 'active' : ''}`}
              aria-pressed={activeFilter === f}
            >
              {f === 'all' ? 'All Requests' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <div className="error-message" role="alert">{error}</div>
      )}

      {/* KPI Stats */}
      <section className="admin-stats" aria-label="Key performance indicators">
        <dl className="admin-stats-grid">
          <div className="stat-card">
            <dt className="stat-label">Total Staff</dt>
            <dd className="stat-value">{staffList.length}</dd>
          </div>
          <div className="stat-card">
            <dt className="stat-label">Total Requests</dt>
            <dd className="stat-value">{requests.length}</dd>
          </div>
          <div className="stat-card">
            <dt className="stat-label">Resolved</dt>
            <dd className="stat-value">{resolvedCount}</dd>
          </div>
        </dl>
      </section>

      {/* Requests Table */}
      <section className="dashboard-section" aria-label="Service requests list">
        <figure className="requests-figure">
          <figcaption className="requests-figcaption">
            <span>Issue Type</span>
            <span>Location</span>
            <span>Status</span>
            <span>Assigned To</span>
            <span>Actions</span>
          </figcaption>

          {filteredRequests.length === 0 ? (
            <p className="empty-state">No requests found.</p>
          ) : (
            <ul className="admin-requests-list" aria-label="Service requests">
              {filteredRequests.map((req) => (
                <li key={req.id}>
                  <article className="admin-request-row">
                    <div className="request-col-category">
                      <h3>{req.category}</h3>
                    </div>
                    <address className="request-col-location">
                      {req.municipality && req.ward
                        ? `${req.municipality}, Ward ${req.ward}`
                        : (req.location || 'Location not specified')}
                    </address>
                    <div className="request-col-status">
                      <output className={`status-badge ${getStatusClass(req.status)}`}>
                        {req.status}
                      </output>
                    </div>
                    <div className="request-col-assign">
                      {req.assigned_staff_name ? (
                        <span className="assigned-staff-name">{req.assigned_staff_name}</span>
                      ) : (!req.assigned &&
                           req.status !== 'Resolved' &&
                           req.status !== 'In Progress' &&
                           req.status !== 'Acknowledged') ? (
                        <select
                          defaultValue=""
                          onChange={(e) => handleAssign(req.id, e.target.value)}
                          className="assign-select"
                          aria-label={`Assign staff to ${req.category}`}
                        >
                          <option value="" disabled>Assign to staff...</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.full_name || s.email || 'Unnamed Worker'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="no-assign">—</span>
                      )}
                    </div>
                    <div className="request-col-actions">
                      <button
                        onClick={() => navigate(`/requests/${req.id}`)}
                        className="view-details-btn"
                        aria-label={`View details for ${req.category}`}
                      >
                        View Details
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </figure>
      </section>
    </article>
  );
}

export default AdminDashboardPage;