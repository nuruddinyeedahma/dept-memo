import { http } from './http.js';

const base = '/api/shop';

export const shopApi = {
  getItems: () => http.get(`${base}/items`),
  createItem: (name, price, category) => http.post(`${base}/items`, { name, price, category }),
  setPrice: (itemId, price) => http.put(`${base}/prices/${itemId}`, { price }),
  clearPrice: (itemId) => http.delete(`${base}/prices/${itemId}`),
  createSale: (sale) => http.post(`${base}/sales`, sale),
  getSales: (month) => http.get(`${base}/sales${month ? `?month=${month}` : ''}`),
  getSummary: (month) => http.get(`${base}/summary${month ? `?month=${month}` : ''}`),
};
