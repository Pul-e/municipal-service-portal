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
  const [wardInfo, setWardInfo] = useState(null);

  // Handle location selection from the map
const handleLocationSelect = async (location) => {
  setSelectedLocation(location);
  
  try {
    // Call Supabase RPC directly (no backend needed)
    const { data, error } = await supabase
      .rpc('get_ward_from_location', { 
        lat: location.lat, 
        lng: location.lng 
      });
    
    if (data && data.length > 0) {
      setWardInfo({
        ward_number: data[0].ward_no,
        municipality: data[0].municipali,
        province: data[0].province,
        ward_id: data[0].ward_id
      });
    } else {
      setWardInfo(null);
    }
  } catch (error) {
    console.error('Failed to fetch ward info:', error);
    setWardInfo(null);
  }
};

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  if (!selectedLocation) {
    setError('Please click on the map to select your location');
    setLoading(false);
    return;
  }

  // Get the current user
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    setError('You must be signed in to submit a report');
    setLoading(false);
    return;
  }

  const locationText = `Lat: ${selectedLocation.lat.toFixed(6)}, Lng: ${selectedLocation.lng.toFixed(6)}`;
  const locationPoint = `POINT(${selectedLocation.lng} ${selectedLocation.lat})`;

const { error: insertError } = await supabase
  .from('service_requests')
  .insert({
    category,
    description,
    location: locationText,
    location_point: locationPoint,
    status: 'Acknowledged',
    user_id: userId,
    ward: String(wardInfo?.ward_number || ''),  // Convert to string explicitly
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

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <fieldset className="form-group">
          <legend>Issue Details</legend>

          <div className="form-field">
            <label htmlFor="category">Issue Category *</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
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
            />
          </div>

          <div className="form-field">
            <label htmlFor="photo">Upload Photo (Optional)</label>
            <input type="file" id="photo" accept="image/*" className="file-input" />
          </div>
        </fieldset>

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
                
                {wardInfo && wardInfo.ward_number && (
                  <>
                    <br />
                    <strong>🏛️ Ward (auto-detected):</strong> Ward {wardInfo.ward_number} - {wardInfo.municipality}
                    <br />
                    <span style={{ fontSize: '0.9em', color: '#666' }}>
                      Data source: {wardInfo.data_source}
                    </span>
                  </>
                )}
                {!wardInfo && (
                  <>
                    <br />
                    <span style={{ fontSize: '0.9em', color: '#e67e22' }}>
                      ⚠️ No ward found for this location (outside South Africa?)
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
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