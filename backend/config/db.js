const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Windows querySrv ECONNREFUSED issues by using Google DNS for Node's dns module
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  let uri = process.env.MONGODB_URI;

  const isPlaceholder = !uri || uri.includes('xxxxx') || uri.includes('YOUR_');

  if (isPlaceholder) {
    console.log('No valid MONGODB_URI found. Starting in-memory MongoDB...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    console.log(`In-memory MongoDB started at ${uri}`);
    console.log('⚠ Data will NOT persist between restarts. Set MONGODB_URI in .env for persistent storage.');
  }

  try {
    if (!isPlaceholder) {
      try {
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return;
      } catch (error) {
        console.error(`MongoDB Error: ${error.message}`);
        console.log('External MongoDB connection failed. Falling back to in-memory MongoDB...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        uri = mongod.getUri();
        console.log(`In-memory MongoDB started at ${uri}`);
      }
    }
    
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Error: ${error.message}`);
    console.error('Server will start without DB.');
  }
};

module.exports = connectDB;
