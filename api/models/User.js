import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ['customer', 'shop', 'admin'] },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
  displayName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', userSchema);
