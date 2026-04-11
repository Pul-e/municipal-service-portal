import { useState } from 'react';
import MapPlaceholder from '../components/MapPlaceholder';

function ReportIssuePage() {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Report submitted! (Demo functionality)');
  };

  return (
    <article className="page-container">
      <header>
        <h1>Report a Service Issue</h1>
      </header>

      <form onSubmit={handleSubmit} className="report-form" aria-label="Service issue report form">
        {/* Category Fieldset */}
        <fieldset className="form-group">
          <legend>Issue Details</legend>
          
          <div className="form-field">
            <label htmlFor="category">Issue Category *</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              aria-required="true"
            >
              <option value="">-- Select an issue type --</option>
              <option value="pothole">🕳️ Pothole</option>
              <option value="burst-pipe">💧 Burst Pipe / Water Leak</option>
              <option value="power-outage">⚡ Power Outage</option>
              <option value="illegal-dumping">🗑️ Illegal Dumping</option>
              <option value="street-light">💡 Street Light Fault</option>
              <option value="other">📋 Other</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the issue in detail..."
              rows="4"
              required
              aria-required="true"
            />
          </div>

          <div className="form-field">
            <label htmlFor="photo">Upload Photo (Optional)</label>
            <input
              type="file"
              id="photo"
              accept="image/*"
              className="file-input"
              aria-label="Upload a photo of the issue"
            />
          </div>
        </fieldset>

        {/* Location Fieldset */}
        <fieldset className="form-group">
          <legend>Location</legend>
          
          <div className="form-field">
            <label>Select Location *</label>
            <figure>
              <MapPlaceholder interactive={true} />
              <figcaption className="location-info">
                <div className="location-detail">
                  <strong>🏛️ Municipality:</strong> City of Johannesburg Metropolitan
                </div>
                <div className="location-detail">
                  <strong>📍 Ward:</strong> Ward 58
                </div>
                <div className="location-detail source">
                  <strong>🗺️ Data Source:</strong> Municipal Demarcation Board (MDB) 2024
                </div>
              </figcaption>
            </figure>
          </div>
        </fieldset>

        <button type="submit" className="submit-btn">
          Submit Report
        </button>
      </form>
    </article>
  );
}

export default ReportIssuePage;