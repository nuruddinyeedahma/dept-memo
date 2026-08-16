import { http } from './http.js';

const base = '/api/shop';

export const shopApi = {
  getItems: () => http.get(`${base}/items`),
  createSale: (sale) => http.post(`${base}/sales`, sale),
  getSales: (month) => http.get(`${base}/sales${month ? `?month=${month}` : ''}`),
  getSummary: (month) => http.get(`${base}/summary${month ? `?month=${month}` : ''}`),
};
