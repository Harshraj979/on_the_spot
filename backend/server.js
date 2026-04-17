// server.js — This is the heart of your backend!
// To start the server, run: npm run dev

require('dotenv').config(); // Load secrets from .env file
require('dns').setDefaultResultOrder('ipv4first'); // Fix fetch timeout for Google APIs

const express      = require('express');
const mongoose     = require('mongoose');
const cors         = require('cors');
const path         = require('path');
const { Server }   = require('socket.io');
const http         = require('http');

// Import our simplified logic from the root folder
const authRoutes = require('./auth_routes');
const mainRoutes = require('./routes');
const ai         = require('./ai');

const app = express();

// 1. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch((err) => console.log('❌ MongoDB Error:', err.message));

// 2. MIDDLEWARE (The helpers)
app.use(cors());              // Allows frontend to talk to backend
app.use(express.json());      // Allows us to read JSON data
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend'))); // Serves your website
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serves uploaded photos

// 3. API ROUTES
app.use('/api/auth', authRoutes); // Handles Login/Register
app.use('/api',      mainRoutes); // Handles Accidents, Claims, Disputes
app.use('/api/ai',   ai.router);  // Handles AI Chat

// Basic "all good" check
app.get('/api/health', (req, res) => res.json({ status: 'running' }));

// 4. HOME PAGE (Redirect everything else to index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// 5. START SERVER
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io); // Share real-time system with routes

// Initialize chat logic
require('./sockets')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server is flying at: http://localhost:${PORT}`);
  console.log(`   Enjoy your simplified backend!\n`);
});
