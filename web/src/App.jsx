import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import ShopList from './pages/ShopList.jsx';
import ShopDetail from './pages/ShopDetail.jsx';
import CurrentBillPage from './pages/CurrentBillPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AdminShopsPage from './pages/AdminShopsPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import ItemsPage from './pages/ItemsPage.jsx';
import ShopHomePage from './pages/ShopHomePage.jsx';
import ShopSellPage from './pages/ShopSellPage.jsx';
import ShopHistoryPage from './pages/ShopHistoryPage.jsx';
import ShopPricesPage from './pages/ShopPricesPage.jsx';
import RoleRoute from './components/RoleRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<RoleRoute roles={['customer']}><ShopList /></RoleRoute>} />
      <Route path="/shops/:id" element={<RoleRoute roles={['customer']}><ShopDetail /></RoleRoute>} />
      <Route path="/shops/:id/bill" element={<RoleRoute roles={['customer']}><CurrentBillPage /></RoleRoute>} />

      <Route path="/admin" element={<RoleRoute roles={['admin']}><AdminShopsPage /></RoleRoute>} />
      <Route path="/admin/items" element={<RoleRoute roles={['admin']}><ItemsPage /></RoleRoute>} />
      <Route path="/admin/users" element={<RoleRoute roles={['admin']}><AdminUsersPage /></RoleRoute>} />

      <Route path="/shop" element={<RoleRoute roles={['shop']}><ShopHomePage /></RoleRoute>} />
      <Route path="/shop/sell" element={<RoleRoute roles={['shop']}><ShopSellPage /></RoleRoute>} />
      <Route path="/shop/history" element={<RoleRoute roles={['shop']}><ShopHistoryPage /></RoleRoute>} />
      <Route path="/shop/prices" element={<RoleRoute roles={['shop']}><ShopPricesPage /></RoleRoute>} />

      <Route path="/settings" element={<RoleRoute roles={['customer', 'admin']}><SettingsPage /></RoleRoute>} />
    </Routes>
  );
}
