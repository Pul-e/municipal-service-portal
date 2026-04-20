const express = require('express');
const router = express.Router();

/**
 * ANALYTICS ENDPOINTS
 * Satisfies requirement: "At least 3 dashboard reports"
 */

// Report 1: Request volume by category and status
router.get('/request-volume', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    
    const { data, error } = await supabase
      .from('service_requests')
      .select('category, status, created_at');

    if (error) throw error;

    // Process data
    const byCategory = {};
    const byStatus = {};
    const timeline = {};

    data.forEach(request => {
      // By category
      byCategory[request.category] = (byCategory[request.category] || 0) + 1;
      
      // By status
      byStatus[request.status] = (byStatus[request.status] || 0) + 1;
      
      // Timeline (last 30 days by default)
      const date = request.created_at.split('T')[0];
      timeline[date] = (timeline[date] || 0) + 1;
    });

    res.json({
      report_type: 'Request Volume Analysis',
      total_requests: data.length,
      by_category: byCategory,
      by_status: byStatus,
      daily_volume: timeline,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Report 2: Resolution times by category
router.get('/resolution-times', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    
    const { data, error } = await supabase
      .from('service_requests')
      .select('category, resolution_time_minutes, created_at, resolved_at')
      .eq('status', 'Resolved')
      .not('resolution_time_minutes', 'is', null);

    if (error) throw error;

    // Calculate average resolution time by category
    const byCategory = {};
    data.forEach(request => {
      if (!byCategory[request.category]) {
        byCategory[request.category] = {
          count: 0,
          total_minutes: 0,
          average_hours: 0
        };
      }
      byCategory[request.category].count++;
      byCategory[request.category].total_minutes += request.resolution_time_minutes;
    });

    // Calculate averages
    Object.keys(byCategory).forEach(cat => {
      const avg = byCategory[cat].total_minutes / byCategory[cat].count;
      byCategory[cat].average_hours = Math.round(avg / 60 * 10) / 10;
    });

    // Overall average
    const overallAvg = data.reduce((sum, r) => sum + r.resolution_time_minutes, 0) / data.length;

    res.json({
      report_type: 'Resolution Time Analysis',
      total_resolved: data.length,
      overall_average_hours: Math.round(overallAvg / 60 * 10) / 10,
      by_category: byCategory,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to generate resolution time analytics' });
  }
});

// Report 3: Worker performance (custom view)
router.get('/worker-performance', async (req, res) => {
  try {
    const { supabase } = req.app.locals;
    
    // Get assignments with resolved requests
    const { data: assignments, error } = await supabase
      .from('service_request_assignments')
      .select(`
        staff_id,
        assigned_at,
        service_requests!inner(
          id,
          status,
          resolution_time_minutes
        )
      `)
      .eq('service_requests.status', 'Resolved');

    if (error) throw error;

    // Get staff profiles
    const staffIds = [...new Set(assignments.map(a => a.staff_id))];
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', staffIds);

    if (profileError) throw profileError;

    // Calculate performance metrics
    const performance = {};
    assignments.forEach(assignment => {
      const staffId = assignment.staff_id;
      if (!performance[staffId]) {
        performance[staffId] = {
          resolved_count: 0,
          total_resolution_minutes: 0
        };
      }
      performance[staffId].resolved_count++;
      performance[staffId].total_resolution_minutes += 
        assignment.service_requests.resolution_time_minutes || 0;
    });

    // Format response with staff names
    const results = profiles.map(profile => ({
      staff_id: profile.id,
      name: profile.full_name,
      resolved_requests: performance[profile.id]?.resolved_count || 0,
      average_resolution_hours: performance[profile.id] 
        ? Math.round((performance[profile.id].total_resolution_minutes / 
           performance[profile.id].resolved_count) / 60 * 10) / 10
        : 0
    }));

    res.json({
      report_type: 'Worker Performance Analysis',
      workers: results.sort((a, b) => b.resolved_requests - a.resolved_requests),
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to generate worker performance analytics' });
  }
});

// Export endpoints
router.get('/export/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    let data;
    
    // Fetch the appropriate report data
    switch(reportType) {
      case 'request-volume':
        const volRes = await req.app.locals.supabase
          .from('service_requests')
          .select('*');
        data = volRes.data;
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}-${Date.now()}.csv`);
    
    // Convert to CSV (simplified - you can enhance this)
    const csv = data.map(row => Object.values(row).join(',')).join('\n');
    res.send(csv);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

module.exports = router;