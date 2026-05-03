require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch');
const connectDB = require('./config/db');
const initSocket = require('./socket/webrtc');

const app = express();
connectDB();

// ── SECURITY ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'https://mediai-smart-healthcare.onrender.com', credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { success: false, message: 'Too many requests' } }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// ── ROUTES ────────────────────────────────────────────────────────
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 15 }), require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/medical', require('./routes/medical'));
app.use('/api/admin', require('./routes/admin'));

// ── AI PROXY (keeps API key secure) ──────────────────────────────
app.post('/api/ai/predict', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(req.body),
    });
    res.json(await response.json());
  } catch (err) { res.status(500).json({ error: 'AI service unavailable' }); }
});

app.get('/api/health', (req, res) => res.json({ success: true, message: 'MediAI Server Running', time: new Date() }));
app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => res.status(500).json({ success: false, message: err.message }));

// ── SERVER (HTTP dev / HTTPS prod) ───────────────────────────────
let server;
if (process.env.NODE_ENV === 'production' && fs.existsSync('./ssl/key.pem') && fs.existsSync('./ssl/cert.pem')) {
  server = https.createServer({ key: fs.readFileSync('./ssl/key.pem'), cert: fs.readFileSync('./ssl/cert.pem') }, app);
  console.log('🔒 HTTPS Enabled');
} else {
  server = http.createServer(app);
}

const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL || "https://medi-ai-smart-healthcare.vercel.app", credentials: true } });
initSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 MediAI Server → http://localhost:${PORT}`);
  console.log(`📡 WebRTC Socket.io ready`);
  console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI}`);
  console.log(`\n🔑 Admin: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}\n`);
});
