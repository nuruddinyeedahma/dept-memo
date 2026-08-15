import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  amount: { type: Number, required: true },
  paidAt: { type: Date, default: Date.now },
  note: { type: String, default: null },
});

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
