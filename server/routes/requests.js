const express = require('express');
const router = express.Router();

/**
 * Enhanced request creation with automatic ward tagging
 * This can be used as an alternative to the direct Supabase calls
 */
router.post('/enhanced', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    const { category, description, latitude, longitude, user_id } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Location coordinates are required' 
      });
    }

    // Step 1: Determine ward from coordinates (SA Data Integration)
    const { data: wardData, error: wardError } = await supabase
      .from('wards')
      .select('ward_number, municipality')
      .filter('geom', 'st_contains', `POINT(${longitude} ${latitude})`);

    const ward = wardData?.[0]?.ward_number || 'Unknown';
    const municipality = wardData?.[0]?.municipality || 'Unknown';

    // Step 2: Create the service request with ward information
    const requestData = {
      category,
      description,
      location: `${municipality}, Ward ${ward}`,
      location_point: `POINT(${longitude} ${latitude})`,
      ward,
      status: 'Acknowledged',
      priority: 'Medium',
      user_id,
      assigned: false
    };

    const { data, error } = await supabase
      .from('service_requests')
      .insert([requestData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      ...data,
      municipality,
      auto_tagged_ward: ward,
      data_source: 'Municipal Demarcation Board (MDB) 2024'
    });

  } catch (error) {
    console.error('Error creating enhanced request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

module.exports = router;