/**
 * Campaign Copilot — CRM Backend Entry Point
 *
 * Main Express server that:
 * - Connects to MongoDB Atlas
 * - Mounts all API routes
 * - Enables CORS for frontend communication
 * - Starts listening on the configured port
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import route handlers
const aiRoutes = require('./routes/ai');
const segmentRoutes = require('./routes/segments');
const campaignRoutes = require('./routes/campaigns');
const receiptRoutes = require('./routes/receipt');
const customerRoutes = require('./routes/customers');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────────────

// Enable CORS for all origins (frontend on Vercel, channel service on Render)
app.use(cors());

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// ─── Routes ─────────────────────────────────────────────────────────

app.use('/api/ai', aiRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/receipt', receiptRoutes);
app.use('/api/customers', customerRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'xeno-crm-backend',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Campaign Copilot CRM Backend is running',
    version: '1.0.0',
    endpoints: {
      ai: '/api/ai/parse',
      segments: '/api/segments/preview',
      campaigns: '/api/campaigns',
      receipt: '/api/receipt',
      customers: '/api/customers',
      health: '/health',
    },
  });
});

// ─── 404 Handler ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ─── Database Connection & Server Start ─────────────────────────────

async function startServer() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Start Express server
    app.listen(PORT, () => {
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  🚀 CAMPAIGN COPILOT — CRM BACKEND');
      console.log(`  📡 Server running on port ${PORT}`);
      console.log(`  🗄️  MongoDB connected`);
      console.log(`  🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? 'Configured' : '⚠️ Missing API key'}`);
      console.log(`  📨 Channel Service: ${process.env.CHANNEL_SERVICE_URL || 'http://localhost:4000'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
