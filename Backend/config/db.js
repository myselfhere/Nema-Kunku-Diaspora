// Backend/config/db.js
import mongoose from "mongoose";

/**
 * Connect to MongoDB
 * @param {string} uri - MongoDB connection string
 */
export async function connectDB(uri) {
  if (!uri) {
    throw new Error("❌ Missing MongoDB URI. Please set MONGO_URI in your .env file.");
  }

  // Enable safer query behavior
  mongoose.set("strictQuery", true);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000, // Fail fast if connection cannot be established
      autoIndex: true,                 // Automatically build indexes defined in schemas
    });

    console.log(
      `✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`
    );
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
}