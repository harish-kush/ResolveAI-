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

const Organization = require('./models/Organization');

const app = express();
const server = http.createServer(app);


// ========================
// ALLOWED STATIC ORIGINS
// ========================

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "https://resolve-ai-theta.vercel.app"
];


// ========================
// COMMON ORIGIN CHECKER
// ========================

const checkOrigin = async (origin, callback) => {

  try {

    // allow postman / mobile apps
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin
      .trim()
      .replace(/\/$/, "")
      .toLowerCase();

    console.log("Incoming Origin:", cleanOrigin);

    // allow static origins
    if (allowedOrigins.includes(cleanOrigin)) {
      console.log("Allowed from static origins");
      return callback(null, true);
    }

    // allow client websites from DB
    const organization = await Organization.findOne({
      website: cleanOrigin,
      isActive: true
    });

    console.log("Organization Found:", !!organization);

    if (organization) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));

  } catch (err) {

    console.log("CORS Error:", err);

    return callback(err);
  }
};


// ========================
// SOCKET.IO
// ========================

const io = new Server(server, {
  cors: {
    origin: checkOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.set('io', io);


// ========================
// MIDDLEWARES
// ========================

app.use(helmet({
  contentSecurityPolicy: false
}));


// EXPRESS CORS

app.use(cors({
  origin: checkOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"]
}));


app.use(express.json({
  limit: '10mb'
}));

app.use(express.urlencoded({
  extended: true
}));

app.use(sanitize);

app.use('/api', apiLimiter);


// ========================
// ROUTES
// ========================

app.use('/api/auth', require('./routes/auth'));

app.use('/api/organization', require('./routes/organization'));

app.use('/api/tickets', require('./routes/tickets'));

app.use('/api/chat', require('./routes/chat'));

app.use('/api/widget', require('./routes/widget'));

app.use('/api/training', require('./routes/training'));

app.use('/api/analytics', require('./routes/analytics'));


// ========================
// HEALTH ROUTE
// ========================

app.get('/api/health', (req, res) => {

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });

});


// ========================
// ERROR HANDLER
// ========================

app.use((err, req, res, next) => {

  console.error(err.stack);

  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  });

});


// ========================
// SOCKET SETUP
// ========================

setupSocket(io);


// ========================
// START SERVER
// ========================

const PORT = process.env.PORT || 5000;

const start = async () => {

  try {

    await connectDB();

    await connectRedis();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {

    console.log("Server Startup Error:", err);

  }

};

start();