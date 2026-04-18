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

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Get auth user
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;
                if (!user) return;
                setUser(user);

                // 2. Get worker profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                    
                if (profileError && profileError.code !== 'PGRST116') throw profileError;
                setProfile(profileData);

                // 3. Get assigned requests (via service_request_assignments)
                const { data: assignments, error: assignError } = await supabase
                    .from('service_request_assignments')
                    .select('request_id, service_requests(*)')
                    .eq('staff_id', user.id)
                    .is('unassigned_at', null);  // Only currently assigned

                if (assignError) throw assignError;

                const assigned = assignments
                    .filter(a => a.service_requests)
                    .map(a => ({
                        ...a.service_requests,
                        assignment_id: a.request_id
                    }));

                // 4. Get unassigned requests (no active assignment)
                const { data: unassigned, error: unassignedError } = await supabase
                    .from('service_requests')
                    .select('*')
                    .not('status', 'eq', 'Resolved');

                if (unassignedError) throw unassignedError;

                // Filter out requests that are already assigned
                const assignedIds = new Set(assigned.map(a => a.id));
                const filteredUnassigned = unassigned.filter(req => !assignedIds.has(req.id));

                setAssignedRequests(assigned);
                setUnassignedRequests(filteredUnassigned);
                
            } catch (err) {
                console.error(err);
                setError('Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    // Claim request (assign to self)
    const handleClaim = async (requestId) => {
        try {
            // Insert into service_request_assignments
            const { error: assignError } = await supabase
                .from('service_request_assignments')
                .insert({
                    request_id: requestId,
                    staff_id: user.id,
                    assigned_by: null,  // Self-assigned
                    assigned_at: new Date().toISOString()
                });

            if (assignError) throw assignError;

            // Update the service_request status
            const { error: updateError } = await supabase
                .from('service_requests')
                .update({ status: 'Assigned' })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Move request from unassigned to assigned in UI
            const claimedRequest = unassignedRequests.find(r => r.id === requestId);
            if (claimedRequest) {
                const updatedRequest = { ...claimedRequest, status: 'Assigned' };
                setAssignedRequests(prev => [...prev, updatedRequest]);
                setUnassignedRequests(prev => prev.filter(r => r.id !== requestId));
            }

        } catch (err) {
            console.error(err);
            setError('Failed to claim request.');
        }
    };

    // Resolve request
    const handleResolve = async (requestId) => {
        try {
            // Update the service_request status
            const { error: updateError } = await supabase
                .from('service_requests')
                .update({ status: 'Resolved' })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // Update the assignment with unassigned_at timestamp
            const { error: unassignError } = await supabase
                .from('service_request_assignments')
                .update({ unassigned_at: new Date().toISOString() })
                .eq('request_id', requestId)
                .is('unassigned_at', null);

            if (unassignError) throw unassignError;

            // Update UI
            setAssignedRequests(prev =>
                prev.map(req =>
                    req.id === requestId ? { ...req, status: 'Resolved' } : req
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
                    <p><strong>{profile?.full_name || user?.email || 'Worker'}</strong></p>
                    <p>{profile?.zone ? `Zone ${profile.zone}` : ''} • {profile?.role || 'Technician'}</p>
                </div>
            </header>

            {error && <p className="error">{error}</p>}

            {/* Stats Summary */}
            <section className="worker-stats">
                <dl className="stats-inline">
                    <div>
                        <dt>Assigned to me</dt>
                        <dd>{assignedRequests.filter(r => r.status !== 'Resolved').length}</dd>
                    </div>
                    <div>
                        <dt>In queue</dt>
                        <dd>{unassignedRequests.length}</dd>
                    </div>
                    <div>
                        <dt>Completed today</dt>
                        <dd>{assignedRequests.filter(r => r.status === 'Resolved').length}</dd>
                    </div>
                </dl>
            </section>

            {/* Assigned to Me Section */}
            <section className="dashboard-section">
                <h2>📋 Assigned to Me</h2>

                {assignedRequests.filter(r => r.status !== 'Resolved').length === 0 ? (
                    <p className="empty-state">No active requests assigned to you.</p>
                ) : (
                    <ul className="worker-request-list">
                        {assignedRequests.filter(r => r.status !== 'Resolved').map((req) => (
                            <li key={req.id}>
                                <article className="worker-request-card">
                                    <header className="worker-request-header">
                                        <h3>{req.category}</h3>
                                        <span className={`priority-badge priority-${req.priority?.toLowerCase() || 'low'}`}>
                                            {req.priority || 'Medium'}
                                        </span>
                                    </header>
                                    <address className="request-location">{req.location}</address>
                                    <footer className="worker-actions">
                                        <StatusBadge status={req.status} />
                                        <button className="action-btn resolve" onClick={() => handleResolve(req.id)}>
                                            Mark Resolved
                                        </button>
                                    </footer>
                                </article>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Unassigned Queue Section */}
            <section className="dashboard-section">
                <h2>⏳ Unassigned Queue</h2>
                <p className="section-description">Requests waiting to be claimed</p>

                {unassignedRequests.length === 0 ? (
                    <p className="empty-state">No requests in queue.</p>
                ) : (
                    <ul className="worker-request-list">
                        {unassignedRequests.map((req) => (
                            <li key={req.id}>
                                <article className="worker-request-card unassigned">
                                    <header className="worker-request-header">
                                        <h3>{req.category}</h3>
                                        <span className={`priority-badge priority-${req.priority?.toLowerCase() || 'low'}`}>
                                            {req.priority || 'Medium'}
                                        </span>
                                    </header>
                                    <address className="request-location">{req.location}</address>
                                    <footer className="worker-actions">
                                        <button className="action-btn claim" onClick={() => handleClaim(req.id)}>
                                            Claim Request
                                        </button>
                                    </footer>
                                </article>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Performance Summary */}
            <aside className="performance-summary">
                <h3>📊 Your Performance</h3>
                <dl className="metrics-grid">
                    <div>
                        <dt>This Week</dt>
                        <dd>{assignedRequests.filter(r => r.status === 'Resolved').length} resolved</dd>
                    </div>
                    <div>
                        <dt>Active Tasks</dt>
                        <dd>{assignedRequests.filter(r => r.status !== 'Resolved').length}</dd>
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