import * as shops from './db/queries/shops.js';
import * as items from './db/queries/items.js';
import * as bills from './db/queries/bills.js';
import * as payments from './db/queries/payments.js';
import * as summary from './db/queries/summary.js';

export const api = {
  getShops: () => shops.getShops(),
  createShop: (name) => shops.createShop(name),
  updateShop: (id, patch) => shops.updateShop(id, patch),
  deleteShop: (id) => shops.deleteShop(id),

  getSummary: () => summary.getSummary(),

  getItems: () => items.getItems(),
  createItem: (name, defaultPrice, category) => items.createItem(name, defaultPrice, category),
  updateItem: (id, patch) => items.updateItem(id, patch),
  getItemShopIds: (itemId) => items.getItemShopIds(itemId),
  setItemShops: (itemId, shopIds) => items.setItemShops(itemId, shopIds),

  getShopPrices: (shopId) => shops.getShopPrices(shopId),
  setShopPrice: (shopId, itemId, price) => shops.setShopPrice(shopId, itemId, price),
  clearShopPrice: (shopId, itemId) => shops.clearShopPrice(shopId, itemId),

  getOpenBill: (shopId) => bills.getOpenBill(shopId),
  addBillEntry: (shopId, itemId, delta) => bills.addBillEntry(shopId, itemId, delta),
  removeBillEntry: (shopId, entryId) => bills.removeBillEntry(shopId, entryId),
  clearBill: (shopId, note) => bills.clearBill(shopId, note),

  getShopBills: (shopId) => bills.getShopBills(shopId),
  getShopPayments: (shopId) => bills.getShopPayments(shopId),
  createPayment: (shopId, billIds, note) => payments.createPayment(shopId, billIds, note),
  createDirectPayment: (shopId, amount, note) => payments.createDirectPayment(shopId, amount, note),
  deletePayment: (shopId, paymentId) => payments.deletePayment(shopId, paymentId),

  getHistory: (shopId) => bills.getHistory(shopId),
  getBill: (billId) => bills.getBill(billId),
};
