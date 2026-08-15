import mongoose from 'mongoose';

const billEntrySchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    itemName: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: true }
);

const billSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  status: { type: String, required: true, enum: ['open', 'cleared'] },
  imported: { type: Boolean, default: false },
  openedAt: { type: Date, default: null },
  clearedAt: { type: Date, default: null },
  note: { type: String, default: null },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  entries: [billEntrySchema],
});

export default mongoose.models.Bill || mongoose.model('Bill', billSchema);
