import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import StatusBadge from '../components/StatusBadge';

function RequestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [assignment, setAssignment] = useState(null);

  useEffect(() => {
    async function fetchRequestDetails() {
      setLoading(true);
      setError(null);

      try {
        const { data: requestData, error: requestError } = await supabase
          .from('service_requests')
          .select('*')
          .eq('id', id)
          .single();

        if (requestError) throw requestError;
        if (!requestData) throw new Error('Request not found');

        setRequest(requestData);

        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback')
          .select('*')
          .eq('request_id', id)
          .maybeSingle();

        if (!feedbackError && feedbackData) {
          setFeedback(feedbackData);
        }

        const { data: assignmentData, error: assignmentError } = await supabase
          .from('service_request_assignments')
          .select(`
            *,
            profiles:staff_id (id, full_name, email)
          `)
          .eq('request_id', id)
          .order('assigned_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!assignmentError && assignmentData) {
          setAssignment(assignmentData);
        }

      } catch (err) {
        console.error('Error fetching request details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchRequestDetails();
    }
  }, [id]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <article className="page-container request-details-loading">
        <p role="status">Loading request details...</p>
      </article>
    );
  }

  if (error || !request) {
    return (
      <article className="page-container request-details-error">
        <header>
          <h2>Error</h2>
        </header>
        <p role="alert">{error || 'Request not found'}</p>
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </article>
    );
  }

  return (
    <article className="page-container">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <header>
        <h1>Request Details</h1>
        <p className="page-subtitle">View full information about your service request</p>
      </header>

      <section className="request-details-card">
        {/* Header with status */}
        <header className="details-header">
          <h2>{request.category?.replace('-', ' ').toUpperCase()}</h2>
          <StatusBadge status={request.status} />
        </header>

        {/* Image if exists */}
        {request.image_url && (
          <figure className="details-image">
            <img 
              src={request.image_url} 
              alt="Service request evidence" 
            />
            <figcaption>Photo evidence submitted with this request</figcaption>
          </figure>
        )}

        {/* Resolution photo uploaded by worker after resolving */}
        {request.resolution_image_url && (
          <figure className="details-image">
            <img
              src={request.resolution_image_url}
              alt="Resolution evidence"
              style={{ border: '2px solid #b7e4c7' }}
            />
            <figcaption style={{ color: '#2d6a4f' }}>✅ Resolution photo added by worker</figcaption>
          </figure>
        )}

        {/* Description */}
        <section className="details-section">
          <h3>Description</h3>
          <p>{request.description || 'No description provided'}</p>
        </section>

        {/* Location Info */}
        <section className="details-section">
          <h3>Location</h3>
          <address>
            <p>📍 {request.municipality || 'Unknown Municipality'}, Ward {request.ward || 'Unknown'}</p>
            {request.address && <p>🏠 {request.address}</p>}
            {request.location_point && (
              <p className="coordinates">
                🗺️ Location: {typeof request.location_point === 'string' 
                  ? request.location_point 
                  : `Point (${request.location_point.coordinates?.[0] || '?'}, ${request.location_point.coordinates?.[1] || '?'})`}
              </p>
            )}
          </address>
        </section>

        {/* Timeline */}
        <section className="details-section">
          <h3>Timeline</h3>
          <dl className="timeline-list">
            <div className="timeline-item">
              <dt>Reported:</dt>
              <dd><time dateTime={request.created_at}>{formatDate(request.created_at)}</time></dd>
            </div>
            {request.updated_at && request.updated_at !== request.created_at && (
              <div className="timeline-item">
                <dt>Last Updated:</dt>
                <dd><time dateTime={request.updated_at}>{formatDate(request.updated_at)}</time></dd>
              </div>
            )}
            {request.resolved_at && (
              <div className="timeline-item">
                <dt>Resolved:</dt>
                <dd><time dateTime={request.resolved_at}>{formatDate(request.resolved_at)}</time></dd>
              </div>
            )}
            {request.resolution_time_minutes && (
              <div className="timeline-item">
                <dt>Resolution Time:</dt>
                <dd>
                  <output>
                    {Math.floor(request.resolution_time_minutes / 60)} hours {request.resolution_time_minutes % 60} minutes
                  </output>
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Assignment Info */}
        {assignment && (
          <section className="details-section">
            <h3>Assigned To</h3>
            <p>👨‍🔧 {assignment.profiles?.full_name || 'Municipal Staff'}</p>
            <p>
              📅 Assigned: <time dateTime={assignment.assigned_at}>{formatDate(assignment.assigned_at)}</time>
            </p>
          </section>
        )}

        {/* Feedback Section */}
        <section className="details-section">
          <h3>Your Feedback</h3>
          {feedback ? (
            <figure className="feedback-display">
              <div className="rating-display">
                <output aria-label={`Rating: ${feedback.rating} out of 5`}>
                  {'⭐'.repeat(feedback.rating)} ({feedback.rating}/5)
                </output>
              </div>
              {feedback.comment && (
                <blockquote className="feedback-comment">
                  <p>"{feedback.comment}"</p>
                </blockquote>
              )}
              <figcaption className="feedback-date">
                Submitted: <time dateTime={feedback.created_at}>{formatDate(feedback.created_at)}</time>
              </figcaption>
            </figure>
          ) : (
            <p className="no-feedback">No feedback submitted yet.</p>
          )}
        </section>
      </section>
    </article>
  );
}

export default RequestDetailsPage;