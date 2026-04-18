require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Import routes
const wardsRouter = require('./routes/wards');
const analyticsRouter = require('./routes/analytics');
const requestsRouter = require('./routes/requests');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase with service role (bypasses RLS for backend operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Make supabase available to routes
app.locals.supabase = supabase;

// Routes
app.use('/api/wards', wardsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/requests', requestsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Municipal Service Delivery API'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;