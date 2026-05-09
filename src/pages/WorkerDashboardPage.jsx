import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import StatusBadge from '../components/StatusBadge';

function WorkerDashboardPage() {
    const navigate = useNavigate();
    const [assignedRequests, setAssignedRequests] = useState([]);
    const [unassignedRequests, setUnassignedRequests] = useState([]);   // ← MISSING LINE
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
        const { data: authData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const currentUser = authData?.user;
        if (!currentUser) {
            setLoading(false);
            return;
        }
        setUser(currentUser);
        
        // Store the ID for use in fetches (avoid state race)
        const userId = currentUser.id;

        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        setProfile(profileData);

        // Pass userId explicitly
        await Promise.all([fetchAssignedRequests(userId), fetchUnassignedRequests()]);
    } catch (err) {
        console.error('loadDashboard error:', err);
        setError(`Failed to load dashboard data: ${err.message}`);
    } finally {
        setLoading(false);
    }
};

    // Requests assigned to this worker (via service_request_assignments)
    const fetchAssignedRequests = async (userId) => {
    if (!userId) {
        setAssignedRequests([]);
        return;
    }

    console.log('Fetching assignments for staff_id:', userId);

    const { data: assignments, error: assignError } = await supabase
        .from('service_request_assignments')
        .select('request_id, assigned_at, assigned_by')
        .eq('staff_id', userId)
        .is('unassigned_at', null);
    if (assignError) throw assignError;

    if (!assignments || assignments.length === 0) {
        setAssignedRequests([]);
        return;
    }

    const requestIds = assignments.map(a => a.request_id);
    const { data: requestsData, error: reqError } = await supabase
        .from('service_requests')
        .select('*')
        .in('id', requestIds)
        .neq('status', 'Resolved');
    if (reqError) throw reqError;

    const merged = requestsData.map(req => ({
        ...req,
        assignment_id: assignments.find(a => a.request_id === req.id)?.request_id,
        assigned_by_admin: assignments.find(a => a.request_id === req.id)?.assigned_by
    }));

    setAssignedRequests(merged);
};

    // Unassigned requests: not resolved and no active assignment
    const fetchUnassignedRequests = async () => {
        
        const { data: assignedIdsData, error: idsError } = await supabase
            .from('service_request_assignments')
            .select('request_id')
            .is('unassigned_at', null);
        if (idsError) throw idsError;

        const assignedIds = assignedIdsData.map(item => item.request_id);

        let query = supabase
            .from('service_requests')
            .select('*')
            .neq('status', 'Resolved');

        if (assignedIds.length > 0) {
            query = query.not('id', 'in', `(${assignedIds.join(',')})`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setUnassignedRequests(data || []);
    };

    // Helper functions (unchanged)
    const getReporterEmail = async (requestId) => {
        try {
            const { data: requestData, error: requestError } = await supabase
                .from('service_requests')
                .select('id, user_id, category, location, address, status')
                .eq('id', requestId)
                .single();
            if (requestError) throw requestError;
            if (!requestData?.user_id) return null;

            const { data: reporterProfile, error: profileError } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .eq('id', requestData.user_id)
                .maybeSingle();
            if (profileError) throw profileError;
            if (!reporterProfile?.email) return null;

            return {
                email: reporterProfile.email,
                full_name: reporterProfile.full_name || 'Resident',
                request: requestData
            };
        } catch (err) {
            console.error('getReporterEmail error:', err);
            return null;
        }
    };

    const sendStatusEmail = async (requestId, newStatus) => {
        try {
            const reporterInfo = await getReporterEmail(requestId);
            if (!reporterInfo?.email) return;

            const payload = {
                to: reporterInfo.email,
                full_name: reporterInfo.full_name,
                request_id: reporterInfo.request.id,
                category: reporterInfo.request.category,
                location: reporterInfo.request.address || reporterInfo.request.location,
                status: newStatus
            };
            const { error } = await supabase.functions.invoke('send-status-email', { body: payload });
            if (error) throw error;
        } catch (err) {
            console.error('sendStatusEmail error:', err);
        }
    };

    const handleStatusUpdate = async (requestId, newStatus) => {
        try {
            setError(null);
            const now = new Date().toISOString();

            const updatePayload = { status: newStatus, updated_at: now };
            if (newStatus === 'Resolved') {
                updatePayload.resolved_at = now;
                await supabase
                    .from('service_request_assignments')
                    .update({ unassigned_at: now })
                    .eq('request_id', requestId)
                    .is('unassigned_at', null);
            }
            if (newStatus === 'Acknowledged' || newStatus === 'In Progress') {
                updatePayload.assigned = true;
            }

            const { error } = await supabase
                .from('service_requests')
                .update(updatePayload)
                .eq('id', requestId);
            if (error) throw error;

            // Refresh both lists
            await Promise.all([fetchAssignedRequests(), fetchUnassignedRequests()]);

            await sendStatusEmail(requestId, newStatus);
        } catch (err) {
            console.error('handleStatusUpdate error:', err);
            setError(`Failed to update request status: ${err.message}`);
        }
    };

    const handleClaim = async (requestId) => {
        try {
            setError(null);
            const { error: assignError } = await supabase
                .from('service_request_assignments')
                .insert({
                    request_id: requestId,
                    staff_id: user.id,
                    assigned_by: null,
                    assigned_at: new Date().toISOString()
                });
            if (assignError) throw assignError;

            await supabase
                .from('service_requests')
                .update({ status: 'Assigned', assigned: true })
                .eq('id', requestId);

            await Promise.all([fetchAssignedRequests(), fetchUnassignedRequests()]);
        } catch (err) {
            console.error(err);
            setError('Failed to claim request.');
        }
    };

    if (loading) {
        return <div className="page-container"><p>Loading dashboard...</p></div>;
    }

    // Group unassigned requests by status
    const newUnassigned = unassignedRequests.filter(
        req => !req.status || req.status === 'Submitted' || req.status === 'Pending'
    );
    const ackUnassigned = unassignedRequests.filter(req => req.status === 'Acknowledged');
    const progUnassigned = unassignedRequests.filter(req => req.status === 'In Progress');

    const assignedActive = assignedRequests.filter(req => req.status !== 'Resolved');

    return (
        <article className="page-container">
            <button className="back-btn" onClick={() => navigate('/')}>← Back to Home</button>
            <header>
                <h1>Municipal Worker Dashboard</h1>
                <div className="worker-info">
                    <p><strong>{profile?.full_name || user?.email || 'Worker'}</strong></p>
                    <p>{profile?.zone ? `Zone ${profile.zone}` : ''} • {profile?.role || 'Municipal Worker'}</p>
                </div>
            </header>

            {error && <p className="error-message">{error}</p>}

            <section className="worker-stats">
                <dl className="stats-inline">
                    <div><dt>Assigned to Me</dt><dd>{assignedActive.length}</dd></div>
                    <div><dt>Unassigned New</dt><dd>{newUnassigned.length}</dd></div>
                    <div><dt>Unassigned In Progress</dt><dd>{progUnassigned.length}</dd></div>
                </dl>
            </section>

            {/* Assigned to Me */}
            <section className="dashboard-section">
                <h2>📌 Assigned to Me</h2>
                {assignedActive.length === 0 ? (
                    <p className="empty-state">No requests assigned to you.</p>
                ) : (
                    <ul className="worker-request-list">
                        {assignedActive.map(req => (
                            <li key={req.id}>
                                <article className="worker-request-card">
                                    <header className="worker-request-header">
                                        <h3>{req.category}</h3>
                                        <span className={`priority-badge priority-${req.priority?.toLowerCase() || 'low'}`}>
                                            {req.priority || 'Medium'}
                                        </span>
                                    </header>
                                    <p>{req.description}</p>
                                    <address>{req.address || req.location}</address>
                                    <footer className="worker-actions">
                                        <StatusBadge status={req.status} />
                                        {req.status !== 'Resolved' && req.status !== 'In Progress' && (
                                            <button onClick={() => handleStatusUpdate(req.id, 'In Progress')}>
                                                Start Progress
                                            </button>
                                        )}
                                        {req.status === 'In Progress' && (
                                            <button onClick={() => handleStatusUpdate(req.id, 'Resolved')}>
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

            {/* Unassigned sections */}
            <section className="dashboard-section">
                <h2>🆕 New Requests (Unassigned)</h2>
                {newUnassigned.length === 0 ? (
                    <p className="empty-state">No new unassigned requests.</p>
                ) : (
                    <ul className="worker-request-list">
                        {newUnassigned.map(req => (
                            <li key={req.id}>
                                <article className="worker-request-card">
                                    <header className="worker-request-header">
                                        <h3>{req.category}</h3>
                                        <span className={`priority-badge priority-${req.priority?.toLowerCase() || 'low'}`}>
                                            {req.priority || 'Medium'}
                                        </span>
                                    </header>
                                    <p>{req.description}</p>
                                    <address>{req.address || req.location}</address>
                                    <footer className="worker-actions">
                                        <StatusBadge status={req.status || 'Submitted'} />
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

            <section className="dashboard-section">
                <h2>📋 Acknowledged (Unassigned)</h2>
                {ackUnassigned.length === 0 ? (
                    <p className="empty-state">No acknowledged unassigned requests.</p>
                ) : (
                    <ul className="worker-request-list">
                        {ackUnassigned.map(req => (
                            <li key={req.id}>
                                <article className="worker-request-card">
                                    <header className="worker-request-header">
                                        <h3>{req.category}</h3>
                                        <span className={`priority-badge priority-${req.priority?.toLowerCase() || 'low'}`}>
                                            {req.priority || 'Medium'}
                                        </span>
                                    </header>
                                    <p>{req.description}</p>
                                    <address>{req.address || req.location}</address>
                                    <footer className="worker-actions">
                                        <StatusBadge status={req.status} />
                                        <button onClick={() => handleStatusUpdate(req.id, 'In Progress')}>
                                            Mark In Progress
                                        </button>
                                    </footer>
                                </article>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="dashboard-section">
                <h2>🛠 In Progress (Unassigned)</h2>
                {progUnassigned.length === 0 ? (
                    <p className="empty-state">No in‑progress unassigned requests.</p>
                ) : (
                    <ul className="worker-request-list">
                        {progUnassigned.map(req => (
                            <li key={req.id}>
                                <article className="worker-request-card">
                                    <header className="worker-request-header">
                                        <h3>{req.category}</h3>
                                        <span className={`priority-badge priority-${req.priority?.toLowerCase() || 'low'}`}>
                                            {req.priority || 'Medium'}
                                        </span>
                                    </header>
                                    <p>{req.description}</p>
                                    <address>{req.address || req.location}</address>
                                    <footer className="worker-actions">
                                        <StatusBadge status={req.status} />
                                        <button onClick={() => handleStatusUpdate(req.id, 'Resolved')}>
                                            Mark Resolved
                                        </button>
                                    </footer>
                                </article>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </article>
    );
}

export default WorkerDashboardPage;