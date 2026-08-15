import mongoose from 'mongoose';

let connPromise = null;

export function connectDb() {
  if (!connPromise) {
    connPromise = mongoose.connect(process.env.MONGODB_URI);
  }
  return connPromise;
}
