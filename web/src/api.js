import { http } from './http.js';

const base = '/api/customer';

export const api = {
  getShops: () => http.get(`${base}/shops`),
  getShop: (id) => http.get(`${base}/shops/${id}`),
  createShop: (name) => http.post(`${base}/shops`, { name }),
  updateShop: (id, patch) => http.patch(`${base}/shops/${id}`, patch),
  deleteShop: (id) => http.delete(`${base}/shops/${id}`),

  getSummary: () => http.get(`${base}/summary`),

  createItem: (name, price, category, shopId) => http.post(`${base}/items`, { name, price, category, shopId }),

  getShopPrices: (shopId) => http.get(`${base}/shops/${shopId}/prices`),
  setShopPrice: (shopId, itemId, price) => http.put(`${base}/shops/${shopId}/prices/${itemId}`, { price }),
  clearShopPrice: (shopId, itemId) => http.delete(`${base}/shops/${shopId}/prices/${itemId}`),

  getOpenBill: (shopId) => http.get(`${base}/shops/${shopId}/open-bill`),
  addBillEntry: (shopId, itemId, delta) => http.post(`${base}/shops/${shopId}/bill-entries`, { itemId, delta }),
  removeBillEntry: (shopId, entryId) => http.delete(`${base}/shops/${shopId}/bill-entries/${entryId}`),
  clearBill: (shopId, note) => http.post(`${base}/shops/${shopId}/clear-bill`, { note }),

  getShopBills: (shopId) => http.get(`${base}/shops/${shopId}/bills`),
  getShopPayments: (shopId) => http.get(`${base}/shops/${shopId}/payments`),
  createPayment: (shopId, billIds, note) => http.post(`${base}/shops/${shopId}/payments`, { billIds, note }),
  createDirectPayment: (shopId, amount, note) => http.post(`${base}/shops/${shopId}/payments/direct`, { amount, note }),
  deletePayment: (shopId, paymentId) => http.delete(`${base}/shops/${shopId}/payments/${paymentId}`),

  getHistory: (shopId) => http.get(`${base}/shops/${shopId}/history`),
  getBill: (billId) => http.get(`${base}/bills/${billId}`),
};
