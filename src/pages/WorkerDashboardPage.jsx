import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import StatusBadge from '../components/StatusBadge';

function WorkerDashboardPage() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
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

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') throw profileError;
            setProfile(profileData);

            await loadRequests();
        } catch (err) {
            console.error('loadDashboard error:', err);
            setError(`Failed to load dashboard data: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadRequests = async () => {
        const { data, error } = await supabase
            .from('service_requests')
            .select('*')
            .neq('status', 'Resolved')
            .order('created_at', { ascending: true });

        if (error) throw error;

        setRequests(data || []);
    };

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

            const { data, error } = await supabase.functions.invoke('send-status-email', {
                body: payload
            });

            if (error) throw error;

        } catch (err) {
            console.error('sendStatusEmail error:', err);
        }
    };

    const handleStatusUpdate = async (requestId, newStatus) => {
        try {
            setError(null);

            const now = new Date().toISOString();

            const updatePayload = {
                status: newStatus,
                updated_at: now
            };

            if (newStatus === 'Resolved') {
                updatePayload.resolved_at = now;
                updatePayload.assigned = false;
            }

            if (newStatus === 'Acknowledged' || newStatus === 'In Progress') {
                updatePayload.assigned = true;
            }

            const { data, error } = await supabase
                .from('service_requests')
                .update(updatePayload)
                .eq('id', requestId)
                .select('id, status, assigned, updated_at, resolved_at');

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error('No rows returned from update.');
            }

            const updatedRow = data[0];

            setRequests(prev =>
                prev.map(req =>
                    req.id === requestId ? { ...req, ...updatedRow } : req
                )
            );

            await sendStatusEmail(requestId, newStatus);
        } catch (err) {
            console.error('handleStatusUpdate error:', err);
            setError(`Failed to update request status: ${err.message}`);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const newRequests = requests.filter(
        (req) => !req.status || req.status === 'Submitted' || req.status === 'Pending'
    );

    const acknowledgedRequests = requests.filter(
        (req) => req.status === 'Acknowledged'
    );

    const inProgressRequests = requests.filter(
        (req) => req.status === 'In Progress'
    );

    return (
        <article className="page-container">
            {/* Back Button */}
            <button className="back-btn" onClick={() => navigate('/')}>
                ← Back to Home
            </button>

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
                    <div>
                        <dt>New Requests</dt>
                        <dd>{newRequests.length}</dd>
                    </div>
                    <div>
                        <dt>Acknowledged</dt>
                        <dd>{acknowledgedRequests.length}</dd>
                    </div>
                    <div>
                        <dt>In Progress</dt>
                        <dd>{inProgressRequests.length}</dd>
                    </div>
                </dl>
            </section>

            <section className="dashboard-section">
                <h2>🆕 New Requests</h2>

                {newRequests.length === 0 ? (
                    <p className="empty-state">No new requests.</p>
                ) : (
                    <ul className="worker-request-list">
                        {newRequests.map((req) => (
                            <li key={req.id}>
                                <article className="worker-request-card">
                                    <header className="worker-request-header">
                                        <h3 className="request-category">{req.category}</h3>
                                        <span className={`priority-badge priority-${req.priority?.toLowerCase() || 'low'}`}>
                                            {req.priority || 'Medium'}
                                        </span>
                                    </header>

                                    <p>{req.description}</p>
                                    <address className="request-location">{req.address || req.location}</address>

                                    <footer className="worker-actions">
                                        <StatusBadge status={req.status || 'Submitted'} />
                                        <button
                                            className="action-btn claim"
                                            onClick={() => handleStatusUpdate(req.id, 'Acknowledged')}
                                        >
                                            Acknowledge
                                        </button>
                                    </footer>
                                </article>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="dashboard-section">
                <h2>📋 Acknowledged Requests</h2>

                {acknowledgedRequests.length === 0 ? (
                    <p className="empty-state">No acknowledged requests.</p>
                ) : (
                    <ul className="worker-request-list">
                        {acknowledgedRequests.map((req) => (
                            <li key={req.id}>
                                <article className="worker-request-card">
                                    <header className="worker-request-header">
                                        <h3 className="request-category">{req.category}</h3>
                                        <span className={`priority-badge priority-${req.priority?.toLowerCase() || 'low'}`}>
                                            {req.priority || 'Medium'}
                                        </span>
                                    </header>

                                    <p>{req.description}</p>
                                    <address className="request-location">{req.address || req.location}</address>

                                    <footer className="worker-actions">
                                        <StatusBadge status={req.status} />
                                        <button
                                            className="action-btn progress"
                                            onClick={() => handleStatusUpdate(req.id, 'In Progress')}
                                        >
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
                <h2>🛠 In Progress Requests</h2>

                {inProgressRequests.length === 0 ? (
                    <p className="empty-state">No requests in progress.</p>
                ) : (
                    <ul className="worker-request-list">
                        {inProgressRequests.map((req) => (
                            <li key={req.id}>
                                <article className="worker-request-card">
                                    <header className="worker-request-header">
                                        <h3 className="request-category">{req.category}</h3>
                                        <span className={`priority-badge priority-${req.priority?.toLowerCase() || 'low'}`}>
                                            {req.priority || 'Medium'}
                                        </span>
                                    </header>

                                    <p>{req.description}</p>
                                    <address className="request-location">{req.address || req.location}</address>

                                    <footer className="worker-actions">
                                        <StatusBadge status={req.status} />
                                        <button
                                            className="action-btn resolve"
                                            onClick={() => handleStatusUpdate(req.id, 'Resolved')}
                                        >
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