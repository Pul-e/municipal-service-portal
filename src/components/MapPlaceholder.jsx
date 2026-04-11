function MapPlaceholder({ interactive = false }) {
  return (
    <figure className={`map-placeholder ${interactive ? 'interactive' : ''}`}>
      <div className="map-content">
        <span className="map-icon" role="img" aria-label="Map">🗺️</span>
        <figcaption>
          <p className="map-text">
            {interactive
              ? 'Click on the map to drop a pin at your location'
              : 'Ward Boundary Map View'}
          </p>
          <p className="map-subtext">
            {interactive
              ? 'Or use current location'
              : 'City of Johannesburg • Ward 58'}
          </p>
        </figcaption>
        {interactive && (
          <button className="location-btn" type="button">
            📍 Use My Current Location
          </button>
        )}
      </div>
    </figure>
  );
}

export default MapPlaceholder;