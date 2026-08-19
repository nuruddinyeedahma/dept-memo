import { http } from './http.js';

const base = '/api/shop';

export const shopApi = {
  getItems: () => http.get(`${base}/items`),
  createItem: (name, price, category) => http.post(`${base}/items`, { name, price, category }),
  setPrice: (itemId, price) => http.put(`${base}/prices/${itemId}`, { price }),
  clearPrice: (itemId) => http.delete(`${base}/prices/${itemId}`),
  createSale: (sale) => http.post(`${base}/sales`, sale),
  getSale: (id) => http.get(`${base}/sales/${id}`),
  updateSale: (id, sale) => http.put(`${base}/sales/${id}`, sale),
  getSales: (month) => http.get(`${base}/sales${month ? `?month=${month}` : ''}`),
  getSummary: (month) => http.get(`${base}/summary${month ? `?month=${month}` : ''}`),

  getDebts: () => http.get(`${base}/debts`),
  getCustomerDebt: (customerName) => http.get(`${base}/debts/${encodeURIComponent(customerName)}`),
  payDebts: (customerName, saleIds, note) => http.post(`${base}/debts/payments`, { customerName, saleIds, note }),
  undoDebtPayment: (paymentId) => http.delete(`${base}/debts/payments/${paymentId}`),
};
