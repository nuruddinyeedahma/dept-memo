import mongoose from 'mongoose';

// A payment against one or more ShopSale.customerOwed debts, grouped by the
// free-text customerName typed at sale time (there's no real customer entity
// in the shop POS - the name string is the only handle we have).
const shopDebtPaymentSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  customerName: { type: String, required: true },
  saleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ShopSale' }],
  amount: { type: Number, required: true },
  // 'payment' = cash actually collected via the "รับชำระหนี้" flow.
  // 'rollup' = no money changed hands - the old balance was just folded into a
  // newer sale's combined total (see POST /shop/sales). Kept distinct so the
  // history/debt UI never implies these sales were paid off.
  kind: { type: String, enum: ['payment', 'rollup'], default: 'payment' },
  paidAt: { type: Date, default: Date.now },
  note: { type: String, default: null },
});

export default mongoose.models.ShopDebtPayment || mongoose.model('ShopDebtPayment', shopDebtPaymentSchema);
