import { http } from './http.js';

const base = '/api/admin';

export const adminApi = {
  getUsers: () => http.get(`${base}/users`),
  createUser: (user) => http.post(`${base}/users`, user),
  updateUser: (id, patch) => http.patch(`${base}/users/${id}`, patch),
  deleteUser: (id) => http.delete(`${base}/users/${id}`),

  getShops: () => http.get(`${base}/shops`),
  createShop: (name) => http.post(`${base}/shops`, { name }),
  updateShop: (id, patch) => http.patch(`${base}/shops/${id}`, patch),

  getItems: () => http.get(`${base}/items`),
  createItem: (name, defaultPrice, category) => http.post(`${base}/items`, { name, defaultPrice, category }),
  updateItem: (id, patch) => http.patch(`${base}/items/${id}`, patch),
  deleteItem: (id) => http.delete(`${base}/items/${id}`),
  setItemShops: (id, shopIds) => http.put(`${base}/items/${id}/shops`, { shopIds }),
  setShopPrice: (shopId, itemId, price) => http.put(`${base}/shops/${shopId}/prices/${itemId}`, { price }),
  bulkSetShopItems: (shopId, includedItemIds) => http.post(`${base}/shops/${shopId}/bulk-items`, { includedItemIds }),
};
