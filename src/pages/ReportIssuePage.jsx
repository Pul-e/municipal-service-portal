import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import InteractiveMap from '../components/InteractiveMap';

function ReportIssuePage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle location selection from the map
  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    console.log('Location selected:', location); // { lat: -26.195, lng: 28.034 }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate location was selected
    if (!selectedLocation) {
      setError('Please click on the map to select your location');
      setLoading(false);
      return;
    }

    // Get the currently logged-in user
    const { data: { user } } = await supabase.auth.getUser();

    // Prepare location string or point for database
    const locationText = `Lat: ${selectedLocation.lat.toFixed(6)}, Lng: ${selectedLocation.lng.toFixed(6)}`;
    const locationPoint = `POINT(${selectedLocation.lng} ${selectedLocation.lat})`;

    const { error: insertError } = await supabase
      .from('service_requests')
      .insert({
        category,
        description,
        location: locationText,  // Human-readable location
        location_point: locationPoint,  // PostGIS point (if column exists)
        status: 'Acknowledged',  // Changed from 'Pending' to match brief
        resident_id: user?.id || null,
      });

    setLoading(false);

    if (insertError) {
      setError('Failed to submit report: ' + insertError.message);
    } else {
      alert('Report submitted successfully!');
      navigate('/my-requests');
    }
  };

  return (
    <article className="page-container">
      <header>
        <h1>Report a Service Issue</h1>
      </header>

      <form onSubmit={handleSubmit} className="report-form" aria-label="Service issue report form">

        {/* Show error if submission fails */}
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

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

        {/* Location Fieldset - NOW WITH INTERACTIVE MAP */}
        <fieldset className="form-group">
          <legend>Location</legend>

          <div className="form-field">
            <label>Click on the map to select your location *</label>
            <InteractiveMap onLocationSelect={handleLocationSelect} />
            
            {selectedLocation && (
              <div className="location-info" style={{ marginTop: '10px', padding: '8px', background: '#e8f5e9', borderRadius: '4px' }}>
                <strong>✅ Selected location:</strong>
                <br />
                Latitude: {selectedLocation.lat.toFixed(6)}
                <br />
                Longitude: {selectedLocation.lng.toFixed(6)}
              </div>
            )}
          </div>

          <figcaption className="location-info">
            <div className="location-detail">
              <strong>🏛️ Municipality:</strong> City of Johannesburg Metropolitan
            </div>
            <div className="location-detail">
              <strong>📍 Ward:</strong> Automatically detected from map click
            </div>
            <div className="location-detail source">
              <strong>🗺️ Data Source:</strong> Municipal Demarcation Board (MDB) 2024
            </div>
          </figcaption>
        </fieldset>

        <button 
          type="submit" 
          className="submit-btn" 
          disabled={loading || !selectedLocation}
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>

      </form>
    </article>
  );
}

export default ReportIssuePage;