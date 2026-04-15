import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import StatusBadge from '../components/StatusBadge';

function WorkerDashboardPage() {
    const [assignedRequests, setAssignedRequests] = useState([]);
    const [unassignedRequests, setUnassignedRequests] = useState([]);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load dashboard data
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Get auth user
                const {
                    data: { user },
                    error: userError,
                } = await supabase.auth.getUser();

                if (userError) throw userError;
                if (!user) return;

                setUser(user);

                // 2. Fetch in parallel
                const [profileRes, assignedRes, unassignedRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', user.id).single(),

                    supabase
                        .from('service_request_assignments')
                        .select('*, service_requests(*)')
                        .eq('staff_id', user.id)
                        .is('unassigned_at', null),

                    supabase
                        .from('service_requests')
                        .select('*')
                        .eq('assigned', false)
                        .eq('status', 'Pending'),
                ]);

                if (profileRes.error) throw profileRes.error;
                if (assignedRes.error) throw assignedRes.error;
                if (unassignedRes.error) throw unassignedRes.error;

                setProfile(profileRes.data);
                setAssignedRequests(assignedRes.data || []);
                setUnassignedRequests(unassignedRes.data || []);
            } catch (err) {
                console.error(err);
                setError('Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    // Claim request
    const handleClaim = async (requestId) => {
        try {
            const { error } = await supabase
                .from('service_request_assignments')
                .insert({
                    request_id: requestId,
                    staff_id: user.id,
                    assigned_by: null,
                });

            if (error) throw error;

            setUnassignedRequests((prev) =>
                prev.filter((r) => r.id !== requestId)
            );
        } catch (err) {
            console.error(err);
            setError('Failed to claim request.');
        }
    };

    // Resolve request
    const handleResolve = async (requestId) => {
        try {
            const { error } = await supabase
                .from('service_requests')
                .update({ status: 'Resolved' })
                .eq('id', requestId);

            if (error) throw error;

            setAssignedRequests((prev) =>
                prev.map((a) =>
                    a.request_id === requestId
                        ? {
                            ...a,
                            service_requests: {
                                ...a.service_requests,
                                status: 'Resolved',
                            },
                        }
                        : a
                )
            );
        } catch (err) {
            console.error(err);
            setError('Failed to resolve request.');
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <article className="page-container">
            <header>
                <h1>Municipal Worker Dashboard</h1>

                <div className="worker-info">
                    <p>
                        <strong>
                            {profile?.full_name || user?.email || 'Worker'}
                        </strong>
                    </p>
                    <p>
                        {profile?.zone ? `Zone ${profile.zone}` : ''} •{' '}
                        {profile?.role || 'Technician'}
                    </p>
                </div>
            </header>

            {error && <p className="error">{error}</p>}

            {/* Stats Summary (from Code 1) */}
            <section className="worker-stats">
                <dl className="stats-inline">
                    <div>
                        <dt>Assigned to me</dt>
                        <dd>{assignedRequests.length}</dd>
                    </div>
                    <div>
                        <dt>In queue</dt>
                        <dd>{unassignedRequests.length}</dd>
                    </div>
                    <div>
                        <dt>Completed today</dt>
                        <dd>
                            {
                                assignedRequests.filter(
                                    (r) => r.service_requests?.status === 'Resolved'
                                ).length
                            }
                        </dd>
                    </div>
                </dl>
            </section>

            {/* Assigned Requests */}
            <section className="dashboard-section">
                <h2>📋 Assigned to Me</h2>

                {assignedRequests.length === 0 ? (
                    <p className="empty-state">
                        No requests assigned to you.
                    </p>
                ) : (
                    <ul className="worker-request-list">
                        {assignedRequests.map((a) => (
                            <li key={a.id}>
                                <article className="worker-request-card">
                                    <header className="worker-request-header">
                                        <h3>{a.service_requests.category}</h3>

                                        <span
                                            className={`priority-badge priority-${a.service_requests.priority?.toLowerCase?.() ||
                                                'low'
                                                }`}
                                        >
                                            {a.service_requests.priority}
                                        </span>
                                    </header>

                                    <address className="request-location">
                                        {a.service_requests.location}
                                    </address>

                                    <footer className="worker-actions">
                                        <StatusBadge
                                            status={a.service_requests.status}
                                        />

                                        {a.service_requests.status !== 'Resolved' && (
                                            <button
                                                className="action-btn resolve"
                                                onClick={() =>
                                                    handleResolve(a.request_id)
                                                }
                                            >
                                                Mark Resolved
                                            </button>
                                        )}
                                    </footer>
                                </article>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Unassigned Queue (enhanced UI from Code 1) */}
            <section className="dashboard-section">
                <h2>⏳ Unassigned Queue</h2>

                <p className="section-description">
                    Requests waiting to be claimed
                </p>

                {unassignedRequests.length === 0 ? (
                    <p className="empty-state">No requests in queue.</p>
                ) : (
                    <ul className="worker-request-list">
                        {unassignedRequests.map((req) => (
                            <li key={req.id}>
                                <article className="worker-request-card unassigned">
                                    <header className="worker-request-header">
                                        <h3>{req.category}</h3>

                                        <span
                                            className={`priority-badge priority-${req.priority?.toLowerCase?.() || 'low'
                                                }`}
                                        >
                                            {req.priority}
                                        </span>
                                    </header>

                                    <address className="request-location">
                                        {req.location}
                                    </address>

                                    <footer className="worker-actions">
                                        <button
                                            className="action-btn claim"
                                            onClick={() => handleClaim(req.id)}
                                        >
                                            Claim Request
                                        </button>
                                    </footer>
                                </article>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Performance Summary (from Code 1) */}
            <aside className="performance-summary">
                <h3>📊 Your Performance</h3>

                <dl className="metrics-grid">
                    <div>
                        <dt>This Week</dt>
                        <dd>
                            {
                                assignedRequests.filter(
                                    (r) =>
                                        r.service_requests?.status === 'Resolved'
                                ).length
                            }{' '}
                            resolved
                        </dd>
                    </div>

                    <div>
                        <dt>Active Tasks</dt>
                        <dd>
                            {
                                assignedRequests.filter(
                                    (r) =>
                                        r.service_requests?.status !== 'Resolved'
                                ).length
                            }
                        </dd>
                    </div>

                    <div>
                        <dt>Rating</dt>
                        <dd>4.8 ⭐</dd>
                    </div>
                </dl>
            </aside>
        </article>
    );
}

export default WorkerDashboardPage;