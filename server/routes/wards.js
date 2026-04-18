const express = require('express');
const router = express.Router();

/**
 * SA DATA INTEGRATION - WARD LOOKUP
 * This endpoint satisfies the highlighted requirement:
 * "Service requests must be automatically tagged to the correct ward and municipality"
 */
router.get('/lookup', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    const { data, error } = await supabase
      .from('wards')
      .select('ward_number, municipality, ward_name, province')
      .filter('geom', 'st_contains', `POINT(${lng} ${lat})`);

    if (error) {
      console.error('PostGIS error:', error);
      
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('find_ward_for_point', { 
          point_lat: parseFloat(lat), 
          point_lng: parseFloat(lng) 
        });
      
      if (rpcError) {
        return res.status(404).json({ 
          error: 'No ward found for this location',
          coordinates: { lat, lng }
        });
      }
      
      return res.json(rpcData);
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ 
        error: 'No ward found for this location',
        coordinates: { lat, lng }
      });
    }

    res.json({
      ...data[0],
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      data_source: 'Municipal Demarcation Board (MDB) 2024',
      lookup_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ward lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup ward' });
  }
});

// ⭐⭐⭐ ADD THE TEST ENDPOINT RIGHT HERE ⭐⭐⭐
router.get('/test-lookup', (req, res) => {
  const { lat, lng } = req.query;
  
  res.json({
    ward_number: "58",
    municipality: "City of Johannesburg",
    ward_name: "Ward 58",
    province: "Gauteng",
    coordinates: { lat, lng },
    data_source: "Municipal Demarcation Board (MDB) 2024",
    lookup_timestamp: new Date().toISOString(),
    note: "This is mock data for demonstration. Real data requires ward boundaries import."
  });
});

/**
 * Get all wards (for dropdowns/filtering)
 */
router.get('/', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    
    const { data, error } = await supabase
      .from('wards')
      .select('ward_number, municipality, ward_name, province')
      .order('municipality')
      .order('ward_number');

    if (error) throw error;

    res.json({
      total: data.length,
      wards: data,
      data_source: 'Municipal Demarcation Board (MDB) 2024'
    });

  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
});

/**
 * Get requests for a specific ward
 */
router.get('/:wardNumber/requests', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { wardNumber } = req.params;
    const { status } = req.query;

    let query = supabase
      .from('service_requests')
      .select('*')
      .eq('ward', wardNumber)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      ward_number: wardNumber,
      total_requests: data.length,
      requests: data
    });

  } catch (error) {
    console.error('Error fetching ward requests:', error);
    res.status(500).json({ error: 'Failed to fetch ward requests' });
  }
});

module.exports = router;