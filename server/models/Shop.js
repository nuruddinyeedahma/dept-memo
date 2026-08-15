import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  phone: { type: String, default: null },
  note: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Shop || mongoose.model('Shop', shopSchema);
