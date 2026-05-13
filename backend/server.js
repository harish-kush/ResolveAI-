require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');
const { apiLimiter } = require('./middleware/rateLimiter');
const { sanitize } = require('./middleware/validate');
const setupSocket = require('./sockets/socketHandler');

const app = express();
const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://yourfrontend.netlify.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('io', io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitize);
app.use('/api', apiLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/organization', require('./routes/organization'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/widget', require('./routes/widget'));
app.use('/api/training', require('./routes/training'));
app.use('/api/analytics', require('./routes/analytics'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

setupSocket(io);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  connectRedis();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
