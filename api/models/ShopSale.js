import mongoose from 'mongoose';

const saleEntrySchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    itemName: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

// Unrelated to the customer debt ledger (Bill/Payment) - a shop's own
// point-of-sale log, kept separate on purpose.
const shopSaleSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [saleEntrySchema],
  total: { type: Number, required: true },
  amountReceived: { type: Number, required: true },
  change: { type: Number, required: true },
  customerOwed: { type: Number, default: 0 },
  note: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ShopSale || mongoose.model('ShopSale', shopSaleSchema);
