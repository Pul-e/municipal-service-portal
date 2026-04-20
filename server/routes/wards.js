const express = require('express');
const router = express.Router();

/**
 * SA DATA INTEGRATION - WARD LOOKUP
 * Satisfies the requirement: "Service requests must be automatically tagged to the correct ward"
 * Data Source: Municipal Demarcation Board (MDB) 2024
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

    // Use the PostGIS function to find which ward contains this point
    const { data, error } = await supabase
      .rpc('get_ward_from_location', { 
        lat: parseFloat(lat), 
        lng: parseFloat(lng) 
      });

    if (error) {
      console.error('Spatial query error:', error);
      return res.status(500).json({ 
        error: 'Failed to lookup ward from coordinates' 
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ 
        message: 'No ward found for these coordinates',
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }
      });
    }

    return res.json({
      ward_number: data[0].ward_no,
      municipality: data[0].municipali,
      ward_name: data[0].ward_label,
      province: data[0].province,
      ward_id: data[0].ward_id,
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      data_source: 'Municipal Demarcation Board (MDB) 2024 - Live Spatial Query',
      lookup_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Ward lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup ward' });
  }
});

/**
 * Get all wards (for dropdowns/filtering)
 */
router.get('/', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { limit = 100, offset = 0 } = req.query;
    
    const { data, error, count } = await supabase
      .from('wards')
      .select('id, ward_id, ward_no, municipali, province, ward_label', { count: 'exact' })
      .order('municipali')
      .order('ward_no')
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    const mappedData = data.map(w => ({
      id: w.id,
      ward_id: w.ward_id,
      ward_number: w.ward_no,
      municipality: w.municipali,
      ward_name: w.ward_label,
      province: w.province
    }));

    res.json({
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      wards: mappedData,
      data_source: 'Municipal Demarcation Board (MDB) 2024'
    });

  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
});

/**
 * Get a single ward by ID or ward number
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { identifier } = req.params;
    
    let query = supabase
      .from('wards')
      .select('id, ward_id, ward_no, municipali, province, ward_label, district');
    
    if (!isNaN(parseInt(identifier))) {
      query = query.eq('id', parseInt(identifier));
    } else {
      query = query.eq('ward_id', identifier);
    }
    
    const { data, error } = await query.single();

    if (error) throw error;

    res.json({
      ward: {
        id: data.id,
        ward_id: data.ward_id,
        ward_number: data.ward_no,
        municipality: data.municipali,
        province: data.province,
        ward_name: data.ward_label,
        district: data.district
      }
    });

  } catch (error) {
    console.error('Error fetching ward:', error);
    res.status(404).json({ error: 'Ward not found' });
  }
});

/**
 * Get requests for a specific ward
 */
router.get('/:wardNumber/requests', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { wardNumber } = req.params;

    const { data, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('ward_no', wardNumber)
      .order('created_at', { ascending: false });

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