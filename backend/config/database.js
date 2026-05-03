const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('[MongoDB] MONGODB_URI is not set in environment variables.');
  }

  try {
    await mongoose.connect(uri);
    console.log(`[MongoDB] Connected successfully to ${mongoose.connection.name}`);
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error.message);
    throw error;
  }

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Runtime connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected from database.');
  });
};

module.exports = { connectDB };
