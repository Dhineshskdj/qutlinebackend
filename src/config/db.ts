import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('Error: MONGO_URI is not defined in the .env file.');
      process.exit(1);
    }
    await mongoose.connect(mongoURI);
    console.log('MongoDB Connected Successfully');
  } catch (err: any) {
    console.error('MongoDB Connection Failed:', err.message);
    // Exit process with failure code
    process.exit(1);
  }
};

export default connectDB;