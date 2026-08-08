import { Routes, Route } from 'react-router-dom';
import ShopList from './pages/ShopList.jsx';
import ShopDetail from './pages/ShopDetail.jsx';
import CurrentBillPage from './pages/CurrentBillPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ShopList />} />
      <Route path="/shops/:id" element={<ShopDetail />} />
      <Route path="/shops/:id/bill" element={<CurrentBillPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}
