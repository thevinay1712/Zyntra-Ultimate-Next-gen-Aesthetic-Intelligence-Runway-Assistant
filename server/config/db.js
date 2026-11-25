const mongoose = require('mongoose');

// Disable command buffering so queries fail-fast when DB is disconnected instead of stalling for 10s
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`⚠️ MongoDB Atlas unreachable (${err.message}). Outbound port 27017 may be blocked by active Wi-Fi. Resilient local offline mode activated!`);
  }
};

module.exports = connectDB;
