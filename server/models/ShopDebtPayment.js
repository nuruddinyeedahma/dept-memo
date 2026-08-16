import mongoose from 'mongoose';

// A payment against one or more ShopSale.customerOwed debts, grouped by the
// free-text customerName typed at sale time (there's no real customer entity
// in the shop POS - the name string is the only handle we have).
const shopDebtPaymentSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customerName: { type: String, required: true },
  saleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ShopSale' }],
  amount: { type: Number, required: true },
  paidAt: { type: Date, default: Date.now },
  note: { type: String, default: null },
});

export default mongoose.models.ShopDebtPayment || mongoose.model('ShopDebtPayment', shopDebtPaymentSchema);
