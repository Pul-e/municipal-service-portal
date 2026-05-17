import { useState, useEffect } from 'react';
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
  const [reportMarkers, setReportMarkers] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const fetchExistingReports = async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('id, status, location_point')
        .not('location_point', 'is', null);

      if (error) {
        console.error('Error fetching reports for map:', error);
        return;
      }

      const markers = data
        .map(req => {
          let lng, lat;
          if (typeof req.location_point === 'string') {
            const match = req.location_point.match(/POINT\(([-\d.]+) ([-+\d.]+)\)/);
            if (match) {
              lng = parseFloat(match[1]);
              lat = parseFloat(match[2]);
            }
          } else if (req.location_point && typeof req.location_point === 'object') {
            if (req.location_point.coordinates && req.location_point.coordinates.length === 2) {
              lng = req.location_point.coordinates[0];
              lat = req.location_point.coordinates[1];
            }
          }
          
          if (lng !== undefined && lat !== undefined) {
            return {
              id: req.id,
              lng: lng,
              lat: lat,
              status: req.status
            };
          }
          return null;
        })
        .filter(Boolean);

      setReportMarkers(markers);
    };

    fetchExistingReports();
  }, []);

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        e.target.value = '';
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPEG, PNG, GIF, or WEBP images are allowed');
        e.target.value = '';
        return;
      }
      
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleLocationSelect = async (location) => {
    setSelectedLocation(location);
    
    try {
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

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      setError('You must be signed in to submit a report');
      setLoading(false);
      return;
    }

    let imageUrl = null;

    if (selectedImage) {
      setUploadingImage(true);
      const fileExt = selectedImage.name.split('.').pop();
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileName = `${timestamp}_${randomString}.${fileExt}`;
      const filePath = `requests/${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('request-images')
        .upload(filePath, selectedImage, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Image upload error:', uploadError);
        setError('Warning: Failed to upload image. Your report will be submitted without it.');
      } else {
        const { data: urlData } = supabase.storage
          .from('request-images')
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }
      setUploadingImage(false);
    }

    const locationPoint = `POINT(${selectedLocation.lng} ${selectedLocation.lat})`;

    const { error: insertError } = await supabase
      .from('service_requests')
      .insert({
        category,
        description,
        location: locationPoint,
        location_point: locationPoint,
        status: 'Pending',
        user_id: userId,
        ward: String(wardInfo?.ward_number || ''),
        municipality: wardInfo?.municipality || '',
        image_url: imageUrl,
      });

    setLoading(false);

    if (insertError) {
      setError('Failed to submit report: ' + insertError.message);
    } else {
      alert('Report submitted successfully!');
      navigate('/resident/dashboard');
    }
  };

  return (
    <article className="page-container">
      <header>
        <h1>Report a Service Issue</h1>
      </header>

      <form onSubmit={handleSubmit} className="report-form" aria-label="Service issue report form">

        {error && (
          <div className="error-message" role="alert">{error}</div>
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
            <input 
              type="file" 
              id="photo" 
              accept="image/*" 
              className="file-input" 
              onChange={handleImageSelect}
            />
            {imagePreview && (
              <figure className="image-preview-container">
                <img 
                  src={imagePreview} 
                  alt="Preview of uploaded issue photo" 
                  className="image-preview"
                />
                <figcaption>
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                      document.getElementById('photo').value = '';
                    }}
                  >
                    Remove
                  </button>
                </figcaption>
              </figure>
            )}
          </div>
        </fieldset>

        <fieldset className="form-group">
          <legend>Location</legend>

          <div className="form-field">
            <label>Click on the map to select your location *</label>
            <InteractiveMap onLocationSelect={handleLocationSelect} markers={reportMarkers} />
            
            {selectedLocation && (
              <output className="location-info">
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
                    <cite>Data source: Municipal Demarcation Board (MDB) 2024</cite>
                  </>
                )}
                {!wardInfo && (
                  <>
                    <br />
                    <span className="ward-not-found">
                      ⚠️ No ward found for this location (outside South Africa?)
                    </span>
                  </>
                )}
              </output>
            )}
          </div>
        </fieldset>

        <button 
          type="submit" 
          className="submit-btn" 
          disabled={loading || uploadingImage || !selectedLocation}
        >
          {loading || uploadingImage ? 'Submitting...' : 'Submit Report'}
        </button>

      </form>
    </article>
  );
}

export default ReportIssuePage;