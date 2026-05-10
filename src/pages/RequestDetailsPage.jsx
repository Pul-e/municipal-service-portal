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
        // Fetch the request details
        const { data: requestData, error: requestError } = await supabase
          .from('service_requests')
          .select('*')
          .eq('id', id)
          .single();

        if (requestError) throw requestError;
        if (!requestData) throw new Error('Request not found');

        setRequest(requestData);

        // Fetch feedback for this request
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback')
          .select('*')
          .eq('request_id', id)
          .maybeSingle();

        if (!feedbackError && feedbackData) {
          setFeedback(feedbackData);
        }

        // Fetch assignment info (who is working on it)
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('service_request_assignments')
          .select(`
            *,
            profiles:staff_id (id, full_name, email)
          `)
          .eq('request_id', id)
          .is('unassigned_at', null)
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
      <div className="page-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading request details...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Error</h2>
        <p>{error || 'Request not found'}</p>
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
    );
  }

  return (
    <article className="page-container">
      <button className="back-btn" onClick={() => navigate('/my-requests')}>
        ← Back to My Requests
      </button>

      <header>
        <h1>Request Details</h1>
        <p className="page-subtitle">View full information about your service request</p>
      </header>

      <div className="request-details-card">
        {/* Header with status */}
        <div className="details-header">
          <h2>{request.category?.replace('-', ' ').toUpperCase()}</h2>
          <StatusBadge status={request.status} />
        </div>

        {/* Image if exists */}
        {request.image_url && (
          <div className="details-image">
            <img 
              src={request.image_url} 
              alt="Service request evidence" 
              style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
            />
          </div>
        )}

        {/* Description */}
        <div className="details-section">
          <h3>Description</h3>
          <p>{request.description || 'No description provided'}</p>
        </div>

        {/* Location Info */}
        <div className="details-section">
          <h3>Location</h3>
          <p>📍 {request.municipality || 'Unknown Municipality'}, Ward {request.ward || 'Unknown'}</p>
          {request.address && <p>🏠 {request.address}</p>}
          {request.location_point && (
            <p className="coordinates">
              🗺️ Location: {typeof request.location_point === 'string' 
                ? request.location_point 
                : `Point (${request.location_point.coordinates?.[0] || '?'}, ${request.location_point.coordinates?.[1] || '?'})`}
            </p>
          )}
        </div>

        {/* Timeline */}
        <div className="details-section">
          <h3>Timeline</h3>
          <ul className="timeline-list">
            <li>
              <strong>Reported:</strong> {formatDate(request.created_at)}
            </li>
            {request.updated_at && request.updated_at !== request.created_at && (
              <li>
                <strong>Last Updated:</strong> {formatDate(request.updated_at)}
              </li>
            )}
            {request.resolved_at && (
              <li>
                <strong>Resolved:</strong> {formatDate(request.resolved_at)}
              </li>
            )}
            {request.resolution_time_minutes && (
              <li>
                <strong>Resolution Time:</strong> {Math.floor(request.resolution_time_minutes / 60)} hours {request.resolution_time_minutes % 60} minutes
              </li>
            )}
          </ul>
        </div>

        {/* Assignment Info */}
        {assignment && (
          <div className="details-section">
            <h3>Assigned To</h3>
            <p>👨‍🔧 {assignment.profiles?.full_name || 'Municipal Staff'}</p>
            <p>📅 Assigned: {formatDate(assignment.assigned_at)}</p>
          </div>
        )}

        {/* Feedback Section */}
        <div className="details-section">
          <h3>Your Feedback</h3>
          {feedback ? (
            <div className="feedback-display">
              <div className="rating-display">
                Rating: {'⭐'.repeat(feedback.rating)} ({feedback.rating}/5)
              </div>
              {feedback.comment && (
                <p className="feedback-comment">"{feedback.comment}"</p>
              )}
              <p className="feedback-date">Submitted: {formatDate(feedback.created_at)}</p>
            </div>
          ) : (
            <p className="no-feedback">No feedback submitted yet.</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .request-details-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-top: 1.5rem;
        }
        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #eef2f6;
        }
        .details-header h2 {
          margin: 0;
          color: #2c3e50;
        }
        .details-section {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eef2f6;
        }
        .details-section h3 {
          margin: 0 0 0.75rem 0;
          color: #495057;
          font-size: 1.1rem;
        }
        .details-section p {
          margin: 0.5rem 0;
          color: #6c757d;
        }
        .details-image {
          text-align: center;
          margin: 1rem 0;
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
        }
        .timeline-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .timeline-list li {
          padding: 0.5rem 0;
          border-bottom: 1px solid #f1f3f5;
        }
        .feedback-display {
          background: #e8f5e9;
          padding: 1rem;
          border-radius: 8px;
        }
        .rating-display {
          font-size: 1.2rem;
          margin-bottom: 0.5rem;
        }
        .feedback-comment {
          font-style: italic;
          margin: 0.5rem 0;
        }
        .no-feedback {
          color: #6c757d;
          font-style: italic;
        }
        .coordinates {
          font-family: monospace;
          font-size: 0.85rem;
        }
      `}</style>
    </article>
  );
}

export default RequestDetailsPage;