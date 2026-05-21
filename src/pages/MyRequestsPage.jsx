import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import StatusBadge from '../components/StatusBadge';

function timeAgo(dateStr) {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function MyRequestsPage() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const [feedbackOpen, setFeedbackOpen] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    async function fetchMyRequests() {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('User error:', userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('service_requests')
        .select('*, municipality, ward')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error.message);
        setLoading(false);
        return;
      }

      const requestIds = (data || []).map((req) => req.id);

      if (requestIds.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('request_id')
        .eq('user_id', user.id)
        .in('request_id', requestIds);

      if (feedbackError) {
        console.error('Error fetching feedback:', feedbackError.message);
      }

      const feedbackRequestIds = new Set(
        (feedbackData || []).map((feedback) => feedback.request_id)
      );

      const requestsWithFeedback = (data || []).map((req) => ({
        ...req,
        feedback_submitted: feedbackRequestIds.has(req.id),
      }));

      setRequests(requestsWithFeedback);
      setLoading(false);
    }

    fetchMyRequests();
  }, []);

  const handleSubmitFeedback = async (requestId) => {
    setSubmitting(true);
    setFeedbackError('');

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error('You must be logged in to submit feedback');
      }

      const { error: insertError } = await supabase.from('feedback').insert({
        request_id: requestId,
        user_id: user.id,
        rating,
        comment,
      });

      if (insertError) throw insertError;

      setFeedbackSuccess(requestId);
      setFeedbackOpen(null);
      setRating(0);
      setComment('');

      setRequests((prevRequests) =>
        prevRequests.map((req) =>
          req.id === requestId
            ? { ...req, feedback_submitted: true }
            : req
        )
      );

      setTimeout(() => setFeedbackSuccess(null), 3000);
    } catch (err) {
      console.error('Feedback error details:', err);
      setFeedbackError(
        'Failed to submit feedback: ' + (err.message || 'Please try again')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openFeedback = (requestId) => {
    setFeedbackOpen(requestId);
    setRating(0);
    setComment('');
    setFeedbackError('');
  };

  const filteredRequests = requests.filter((req) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'open') return req.status !== 'Resolved';
    if (activeFilter === 'resolved') return req.status === 'Resolved';
    return true;
  });

  const openCount = requests.filter((r) => r.status !== 'Resolved').length;
  const resolvedCount = requests.filter((r) => r.status === 'Resolved').length;

  return (
    <article className="page-container">
      <button
        className="back-btn"
        onClick={() => navigate('/resident/dashboard')}
      >
        ← Back to Dashboard
      </button>

      <header>
        <h1>My Service Requests</h1>
        <p className="page-subtitle" role="doc-subtitle">
          Track and manage your reported municipal issues
        </p>
      </header>

      <nav className="filter-tabs" aria-label="Filter service requests">
        <ul role="tablist">
          <li role="presentation">
            <button
              role="tab"
              aria-selected={activeFilter === 'all'}
              aria-controls="requests-panel"
              className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Requests <span className="count">{requests.length}</span>
            </button>
          </li>

          <li role="presentation">
            <button
              role="tab"
              aria-selected={activeFilter === 'open'}
              aria-controls="requests-panel"
              className={`filter-tab ${activeFilter === 'open' ? 'active' : ''}`}
              onClick={() => setActiveFilter('open')}
            >
              Open <span className="count">{openCount}</span>
            </button>
          </li>

          <li role="presentation">
            <button
              role="tab"
              aria-selected={activeFilter === 'resolved'}
              aria-controls="requests-panel"
              className={`filter-tab ${
                activeFilter === 'resolved' ? 'active' : ''
              }`}
              onClick={() => setActiveFilter('resolved')}
            >
              Resolved <span className="count">{resolvedCount}</span>
            </button>
          </li>
        </ul>
      </nav>

      <section
        id="requests-panel"
        role="tabpanel"
        aria-label={`${activeFilter} service requests`}
      >
        {loading ? (
          <p className="loading-text" role="status">
            Loading your requests...
          </p>
        ) : filteredRequests.length > 0 ? (
          <ul className="requests-list" aria-label="Your service requests">
            {filteredRequests.map((request) => (
              <li key={request.id}>
                <article className="request-card">
                  <header className="request-header">
                    <h2 className="request-category">{request.category}</h2>
                    <StatusBadge status={request.status} />
                  </header>

                  <address className="request-location">
                    📍{' '}
                    {request.municipality && request.ward
                      ? `${request.municipality}, Ward ${request.ward}`
                      : request.location || 'Location not specified'}
                  </address>

                  <footer className="request-footer">
                    <time
                      dateTime={request.created_at}
                      className="request-date"
                    >
                      📅 Reported {timeAgo(request.created_at)}
                    </time>

                    <div className="request-actions">
                      <button
                        className="view-details-btn"
                        onClick={() => navigate(`/requests/${request.id}`)}
                        aria-label={`View details for ${request.category} at ${request.location}`}
                      >
                        View Details →
                      </button>

                      {request.status === 'Resolved' &&
                        !request.feedback_submitted && (
                          <button
                            className="feedback-btn"
                            onClick={() => openFeedback(request.id)}
                            aria-label={`Leave feedback for ${request.category}`}
                          >
                            ⭐ Rate Service
                          </button>
                        )}

                      {request.feedback_submitted && (
                        <output className="feedback-submitted-badge">
                          ✅ Feedback Submitted
                        </output>
                      )}
                    </div>
                  </footer>

                  {feedbackOpen === request.id && (
                    <fieldset className="feedback-form-container">
                      <legend>Rate Your Experience</legend>

                      <p className="feedback-request-info">
                        {request.category} at {request.location}
                      </p>

                      <div
                        className="star-rating"
                        role="radiogroup"
                        aria-label="Rate your experience"
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`star-btn ${
                              star <= rating ? 'active' : ''
                            }`}
                            onClick={() => setRating(star)}
                            aria-label={`${star} star${
                              star !== 1 ? 's' : ''
                            }`}
                          >
                            {star <= rating ? '⭐' : '☆'}
                          </button>
                        ))}
                      </div>

                      <div className="form-group">
                        <label htmlFor={`comment-${request.id}`}>
                          Additional Comments (Optional)
                        </label>

                        <textarea
                          id={`comment-${request.id}`}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Tell us about your experience..."
                          rows="3"
                        />
                      </div>

                      {feedbackError && (
                        <p className="feedback-error" role="alert">
                          {feedbackError}
                        </p>
                      )}

                      <div className="feedback-actions">
                        <button
                          className="submit-feedback-btn"
                          onClick={() => handleSubmitFeedback(request.id)}
                          disabled={rating === 0 || submitting}
                        >
                          {submitting ? 'Submitting...' : 'Submit Feedback'}
                        </button>

                        <button
                          className="cancel-feedback-btn"
                          onClick={() => setFeedbackOpen(null)}
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                      </div>
                    </fieldset>
                  )}
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-requests" role="status" aria-live="polite">
            <p>No requests found.</p>
          </div>
        )}
      </section>

      {feedbackSuccess && (
        <output className="feedback-toast" role="status" aria-live="polite">
          ✅ Thank you for your feedback!
        </output>
      )}

      <aside className="help-section" aria-label="Help and information">
        <h3>Need Help?</h3>
        <p>If your issue hasn't been addressed, you can:</p>
        <ul>
          <li>📞 Call our helpline: 0800 123 456</li>
          <li>📧 Email: support@municipalconnect.co.za</li>
          <li>🏢 Visit your nearest municipal office</li>
        </ul>
      </aside>
    </article>
  );
}

export default MyRequestsPage;