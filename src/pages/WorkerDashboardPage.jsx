import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import StatusBadge from '../components/StatusBadge';

function WorkerDashboardPage() {
    const navigate = useNavigate();

    const [assignedRequests, setAssignedRequests] = useState([]);
    const [unassignedRequests, setUnassignedRequests] = useState([]);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Image upload state: { requestId, file, previewUrl, uploading, uploadError, uploaded }
    const [imageUpload, setImageUpload] = useState(null);
    const fileInputRef = useRef(null);

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
            const userId = currentUser.id;

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError && profileError.code !== 'PGRST116') throw profileError;

            setProfile(profileData);

            await Promise.all([
                fetchAssignedRequests(userId),
                fetchUnassignedRequests()
            ]);
        } catch (err) {
            console.error('loadDashboard error:', err);
            setError(`Failed to load dashboard data: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignedRequests = async (userId) => {
        if (!userId) {
            setAssignedRequests([]);
            return;
        }

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

        const merged = (requestsData || []).map(req => {
            const assignment = assignments.find(a => a.request_id === req.id);
            return {
                ...req,
                assignment_id: assignment?.request_id,
                assigned_by_admin: assignment?.assigned_by
            };
        });

        setAssignedRequests(merged);
    };

    const fetchUnassignedRequests = async () => {
        const { data: assignedIdsData, error: idsError } = await supabase
            .from('service_request_assignments')
            .select('request_id')
            .is('unassigned_at', null);

        if (idsError) throw idsError;

        const assignedIds = (assignedIdsData || []).map(item => item.request_id);

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

            const { error } = await supabase.functions.invoke('send-status-email', {
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

            if (!user?.id) {
                setError('User not loaded. Please refresh and try again.');
                return;
            }

            const now = new Date().toISOString();
            const updatePayload = { status: newStatus, updated_at: now };

            if (newStatus === 'Resolved') {
                updatePayload.resolved_at = now;
                const { error: unassignError } = await supabase
                    .from('service_request_assignments')
                    .update({ unassigned_at: now })
                    .eq('request_id', requestId)
                    .is('unassigned_at', null);
                if (unassignError) throw unassignError;

                // Open image upload modal after resolving
                setImageUpload({
                    requestId,
                    file: null,
                    previewUrl: null,
                    uploading: false,
                    uploadError: null,
                    uploaded: false
                });
            }

            if (newStatus === 'Acknowledged' || newStatus === 'In Progress') {
                updatePayload.assigned = true;
            }

            const { error: updateError } = await supabase
                .from('service_requests')
                .update(updatePayload)
                .eq('id', requestId);

            if (updateError) throw updateError;

            await Promise.all([
                fetchAssignedRequests(user.id),
                fetchUnassignedRequests()
            ]);

            await sendStatusEmail(requestId, newStatus);
        } catch (err) {
            console.error('handleStatusUpdate error:', err);
            setError(`Failed to update request status: ${err.message}`);
        }
    };

    const handleClaim = async (requestId) => {
        try {
            setError(null);

            if (!user?.id) {
                setError('User not loaded. Please refresh and try again.');
                return;
            }

            const now = new Date().toISOString();

            const { error: assignError } = await supabase
                .from('service_request_assignments')
                .insert({
                    request_id: requestId,
                    staff_id: user.id,
                    assigned_by: null,
                    assigned_at: now
                });

            if (assignError) throw assignError;

            const { error: updateError } = await supabase
                .from('service_requests')
                .update({
                    status: 'Assigned',
                    assigned: true,
                    updated_at: now
                })
                .eq('id', requestId);

            if (updateError) throw updateError;

            await Promise.all([
                fetchAssignedRequests(user.id),
                fetchUnassignedRequests()
            ]);
        } catch (err) {
            console.error('handleClaim error:', err);
            setError(`Failed to claim request: ${err.message}`);
        }
    };

    // ── NEW: Image upload handlers ─────────────────────────────────────────

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setImageUpload(prev => ({ ...prev, uploadError: 'Please select an image file.' }));
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setImageUpload(prev => ({ ...prev, uploadError: 'Image must be under 10 MB.' }));
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setImageUpload(prev => ({ ...prev, file, previewUrl, uploadError: null }));
    };

    const handleImageUpload = async () => {
        if (!imageUpload?.file || !imageUpload?.requestId) return;

        setImageUpload(prev => ({ ...prev, uploading: true, uploadError: null }));

        try {
            const { file, requestId } = imageUpload;
            const ext = file.name.split('.').pop();
            const filePath = `resolution-images/${requestId}-${Date.now()}.${ext}`;

            // 1. Upload file to Supabase Storage bucket "request-images"
            const { error: storageError } = await supabase.storage
                .from('request-images')
                .upload(filePath, file, { upsert: true });

            if (storageError) throw storageError;

            // 2. Get the public URL
            const { data: urlData } = supabase.storage
                .from('request-images')
                .getPublicUrl(filePath);

            const publicUrl = urlData?.publicUrl;
            if (!publicUrl) throw new Error('Could not get public URL for uploaded image.');

            // 3. Save URL to the assignment row (matched by request + worker)
            const { error: assignmentError } = await supabase
                .from('service_request_assignments')
                .update({ image_url: publicUrl })
                .eq('request_id', requestId)
                .eq('staff_id', user.id);

            if (assignmentError) throw assignmentError;

            const { error: requestError } = await supabase
                .from('service_requests')
                .update({ resolution_image_url: publicUrl })
                .eq('id', requestId);

            if (requestError) throw requestError;

            setImageUpload(prev => ({ ...prev, uploading: false, uploaded: true }));
        } catch (err) {
            console.error('Image upload error:', err);
            setImageUpload(prev => ({
                ...prev,
                uploading: false,
                uploadError: err.message || 'Upload failed. Please try again.'
            }));
        }
    };

    const handleDismissUpload = () => {
        if (imageUpload?.previewUrl) URL.revokeObjectURL(imageUpload.previewUrl);
        setImageUpload(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Render ─────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <article className="page-container">
                <p role="status">Loading dashboard...</p>
            </article>
        );
    }

    const newUnassigned = unassignedRequests.filter(
        req => !req.status || req.status === 'Submitted' || req.status === 'Pending'
    );

    const ackUnassigned = unassignedRequests.filter(
        req => req.status === 'Acknowledged'
    );

    const progUnassigned = unassignedRequests.filter(
        req => req.status === 'In Progress'
    );

    const assignedActive = assignedRequests.filter(
        req => req.status !== 'Resolved'
    );

    return (
        <article className="page-container">
            <button className="back-btn" onClick={() => navigate('/')}>
                ← Back to Home
            </button>

            <header>
                <h1>Municipal Worker Dashboard</h1>

                <div className="worker-info">
                    <p>
                        <strong>{profile?.full_name || user?.email || 'Worker'}</strong>
                    </p>
                    <p>
                        {profile?.zone ? `Zone ${profile.zone}` : ''} • {profile?.role || 'Municipal Worker'}
                    </p>
                </div>
            </header>

            {error && <p className="error-message" role="alert">{error}</p>}

            {/* Resolution image upload modal */}
            {imageUpload && (
                <div className="resolution-upload-overlay">
                    <div className="resolution-upload-modal">
                        {imageUpload.uploaded ? (
                            <>
                                <div className="upload-success-icon">✅</div>
                                <h3>Image Uploaded</h3>
                                <p>The resolution photo has been saved to this request.</p>
                                {imageUpload.previewUrl && (
                                    <img
                                        src={imageUpload.previewUrl}
                                        alt="Uploaded resolution"
                                        className="upload-preview uploaded"
                                    />
                                )}
                                <button className="action-btn claim" onClick={handleDismissUpload}>
                                    Done
                                </button>
                            </>
                        ) : (
                            <>
                                <h3>📸 Add Resolution Photo</h3>
                                <p className="upload-subtitle">
                                    Optionally attach a photo showing the resolved issue.
                                </p>

                                {imageUpload.previewUrl ? (
                                    <img
                                        src={imageUpload.previewUrl}
                                        alt="Preview"
                                        className="upload-preview"
                                    />
                                ) : (
                                    <label className="upload-dropzone" htmlFor="resolution-file-input">
                                        <span className="upload-icon">🖼️</span>
                                        <span>Click to choose a photo</span>
                                        <span className="upload-hint">JPG, PNG, WEBP · Max 10 MB</span>
                                    </label>
                                )}

                                <input
                                    id="resolution-file-input"
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleFileSelect}
                                />

                                {imageUpload.uploadError && (
                                    <p className="upload-error">{imageUpload.uploadError}</p>
                                )}

                                <div className="upload-actions">
                                    {imageUpload.file && !imageUpload.uploading && (
                                        <button
                                            className="action-btn"
                                            style={{ background: '#e9ecef', color: '#495057', border: '1px solid #ced4da' }}
                                            onClick={() => {
                                                URL.revokeObjectURL(imageUpload.previewUrl);
                                                setImageUpload(prev => ({ ...prev, file: null, previewUrl: null }));
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                        >
                                            Change Photo
                                        </button>
                                    )}

                                    {imageUpload.file && (
                                        <button
                                            className="action-btn claim"
                                            onClick={handleImageUpload}
                                            disabled={imageUpload.uploading}
                                        >
                                            {imageUpload.uploading ? 'Uploading…' : 'Upload Photo'}
                                        </button>
                                    )}

                                    <button
                                        className="action-btn"
                                        style={{ background: 'none', color: '#6c757d', border: '1px solid #dee2e6' }}
                                        onClick={handleDismissUpload}
                                        disabled={imageUpload.uploading}
                                    >
                                        Skip
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            <section className="worker-stats" aria-label="Workload summary">
                <dl className="stats-inline">
                    <div>
                        <dt>Assigned to Me</dt>
                        <dd>{assignedActive.length}</dd>
                    </div>
                    <div>
                        <dt>Unassigned New</dt>
                        <dd>{newUnassigned.length}</dd>
                    </div>
                    <div>
                        <dt>Unassigned In Progress</dt>
                        <dd>{progUnassigned.length}</dd>
                    </div>
                </dl>
            </section>

            {/* Assigned Section */}
            <section className="dashboard-section" aria-labelledby="assigned-heading">
                <h2 id="assigned-heading">📌 Assigned to Me</h2>

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
                                    <address className="request-location">{req.address || req.location}</address>

                                    <footer className="worker-actions">
                                        <StatusBadge status={req.status} />

                                        {req.status !== 'Resolved' && req.status !== 'In Progress' && (
                                            <button
                                                className="action-btn progress"
                                                onClick={() => handleStatusUpdate(req.id, 'In Progress')}
                                            >
                                                Start Progress
                                            </button>
                                        )}

                                        {req.status === 'In Progress' && (
                                            <button
                                                className="action-btn resolve"
                                                onClick={() => handleStatusUpdate(req.id, 'Resolved')}
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

            {/* New Unassigned Section */}
            <section className="dashboard-section" aria-labelledby="new-heading">
                <h2 id="new-heading">🆕 New Requests Unassigned</h2>

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
                                    <address className="request-location">{req.address || req.location}</address>

                                    <footer className="worker-actions">
                                        <StatusBadge status={req.status || 'Submitted'} />

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

            {/* Acknowledged Section */}
            <section className="dashboard-section" aria-labelledby="ack-heading">
                <h2 id="ack-heading">📋 Acknowledged</h2>

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

            {/* In Progress Section */}
            <section className="dashboard-section" aria-labelledby="prog-heading">
                <h2 id="prog-heading">🛠 In Progress</h2>

                {progUnassigned.length === 0 ? (
                    <p className="empty-state">No in-progress unassigned requests.</p>
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