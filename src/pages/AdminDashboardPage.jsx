import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function AdminDashboardPage() {
    const [requests, setRequests] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                // Get admin user
                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (userError) throw userError;
                setUser(user);

                // Load in parallel
                const [reqRes, staffRes] = await Promise.all([
                    supabase
                        .from('service_requests')
                        .select('*')
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('profiles')
                        .select('id, full_name, role')
                        .eq('role', 'staff'),
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

    // Assign request to staff
    const handleAssign = async (requestId, staffId) => {
        try {
            if (!staffId) return;

            const { error } = await supabase
                .from('service_request_assignments')
                .insert({
                    request_id: requestId,
                    staff_id: staffId,
                    assigned_by: user?.id,
                });

            if (error) throw error;

            // Optimistic UI update: mark request as assigned locally
            setRequests((prev) =>
                prev.map((req) =>
                    req.id === requestId ? { ...req, assigned: true } : req
                )
            );
        } catch (err) {
            console.error(err);
            setError('Failed to assign request.');
        }
    };

    if (loading) {
        return (
            <article className="page-container">
                <p>Loading admin dashboard...</p>
            </article>
        );
    }

    return (
        <article className="page-container">
            <header>
                <h1>Admin Dashboard</h1>
                <p>System Administrator • All Wards</p>
            </header>

            {error && <p className="error">{error}</p>}

            {/* Stats Section */}
            <section className="admin-stats">
                <div className="stat-card">
                    <span className="stat-value">{staffList.length}</span>
                    <span className="stat-label">Total Staff</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{requests.length}</span>
                    <span className="stat-label">Total Requests</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{requests.filter((r) => r.status === 'Resolved').length}</span>
                    <span className="stat-label">Resolved</span>
                </div>
            </section>

            {/* Management Actions */}
            <section className="admin-actions">
                <h2>Management</h2>
                <div className="management-buttons">
                    <Link to="/admin/users" className="management-btn">
                        👥 Manage Users
                    </Link>
                    <button className="management-btn">
                        📋 View All Reports
                    </button>
                    <button className="management-btn">
                        🔧 Assign Workers
                    </button>
                </div>
            </section>

            {/* Requests Table/List */}
            <section className="dashboard-section">
                <h2>All Service Requests</h2>

                {requests.length === 0 ? (
                    <p>No requests found.</p>
                ) : (
                    <ul className="worker-request-list">
                        {requests.map((req) => (
                            <li key={req.id}>
                                <article className="worker-request-card">
                                    <header className="worker-request-header">
                                        <h3>{req.category}</h3>
                                        <span className={`status ${req.status}`}>
                                            {req.status}
                                        </span>
                                    </header>
                                    <p>{req.location}</p>

                                    {/* Assignment control */}
                                    {!req.assigned && (
                                        <footer className="worker-actions">
                                            <select
                                                defaultValue=""
                                                onChange={(e) => handleAssign(req.id, e.target.value)}
                                            >
                                                <option value="" disabled>Assign to staff...</option>
                                                {staffList.map((s) => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.full_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </footer>
                                    )}
                                </article>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </article>
    );
}

export default AdminDashboardPage;