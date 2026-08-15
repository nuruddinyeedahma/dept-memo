import mongoose from 'mongoose';

const priceOverrideSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  defaultPrice: { type: Number, required: true },
  category: { type: String, default: null },
  active: { type: Boolean, default: true },
  // empty = visible to every shop; non-empty = only these shops
  shopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shop' }],
  priceOverrides: [priceOverrideSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Item || mongoose.model('Item', itemSchema);
