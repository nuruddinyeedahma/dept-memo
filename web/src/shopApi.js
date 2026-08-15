import { http } from './http.js';

const base = '/api/shop';

export const shopApi = {
  getItems: () => http.get(`${base}/items`),
  createSale: (sale) => http.post(`${base}/sales`, sale),
  getSales: () => http.get(`${base}/sales`),
};
