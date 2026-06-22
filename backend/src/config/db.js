const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[DB] Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[DB] Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
