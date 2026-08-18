import { useEffect, useState } from 'react';
import { adminApi } from '../adminApi.js';
import AdminNav from '../components/AdminNav.jsx';
import useLockBodyScroll from '../hooks/useLockBodyScroll.js';
import Loader from '../components/Loader.jsx';

const ROLE_LABEL = { customer: 'ลูกค้า', shop: 'ร้านค้า', admin: 'แอดมิน' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'customer', shopId: '', displayName: '' });
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ displayName: '', shopId: '' });
  const [editError, setEditError] = useState('');
  useLockBodyScroll(showAdd || !!confirmDeleteId || !!editUser);

  async function load() {
    setLoading(true);
    try {
      const [userList, shopList] = await Promise.all([adminApi.getUsers(), adminApi.getShops()]);
      setUsers(userList);
      setShops(shopList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password) {
      setError('กรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    if (form.role === 'shop' && !form.shopId) {
      setError('ผู้ใช้บทบาทร้านค้าต้องเลือกร้าน');
      return;
    }
    try {
      await adminApi.createUser({
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        shopId: form.role === 'shop' ? form.shopId : undefined,
        displayName: form.displayName.trim() || undefined,
      });
      setForm({ username: '', password: '', role: 'customer', shopId: '', displayName: '' });
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    await adminApi.deleteUser(id);
    setConfirmDeleteId(null);
    load();
  }

  function openEdit(u) {
    setEditUser(u);
    setEditForm({ displayName: u.displayName ?? '', shopId: u.shopId ?? '' });
    setEditError('');
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setEditError('');
    if (editUser.role === 'shop' && !editForm.shopId) {
      setEditError('ผู้ใช้บทบาทร้านค้าต้องเลือกร้าน');
      return;
    }
    try {
      await adminApi.updateUser(editUser.id, {
        displayName: editForm.displayName.trim(),
        shopId: editUser.role === 'shop' ? editForm.shopId : undefined,
      });
      setEditUser(null);
      load();
    } catch (err) {
      setEditError(err.message);
    }
  }

  function shopName(shopId) {
    return shops.find((s) => s.id === shopId)?.name ?? '-';
  }

  return (
    <div className="app">
      <div className="light-header">
        <div className="shop-title">ผู้ใช้งาน</div>
      </div>

      <div className="section-pad">
        {loading ? (
          <Loader />
        ) : (
          <div className="price-panel">
            {users.map((u) => (
              <div className="price-row item-manage-row" key={u.id} onClick={() => openEdit(u)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="price-row-name">{u.username}</div>
                  <div className="price-row-default tabular">
                    {ROLE_LABEL[u.role]}
                    {u.displayName ? ` · ${u.displayName}` : ''}
                    {u.role === 'shop' ? ` · ${shopName(u.shopId)}` : ''}
                  </div>
                </div>
                <button
                  className="btn-danger-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(u.id);
                  }}
                >
                  ลบ
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-outline-gold" onClick={() => setShowAdd(true)}>
          + เพิ่มผู้ใช้งาน
        </button>
      </div>

      <div style={{ flex: 1 }} />
      <AdminNav />

      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">เพิ่มผู้ใช้งาน</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="field-input"
                placeholder="ชื่อผู้ใช้"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
              <input
                className="field-input"
                type="password"
                placeholder="รหัสผ่าน"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <input
                className="field-input"
                placeholder="ชื่อที่แสดง (ไม่บังคับ)"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
              <div className="chip-row">
                {Object.entries(ROLE_LABEL).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`chip ${form.role === key ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, role: key })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {form.role === 'shop' && (
                <div className="chip-row">
                  {shops.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`chip ${form.shopId === s.id ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, shopId: s.id })}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              {error && <p className="shake" style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline-gold" onClick={() => setShowAdd(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-dark">
                  เพิ่ม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div className="modal-backdrop" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">แก้ไข {editUser.username}</h2>
            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="field-input"
                placeholder="ชื่อที่แสดง"
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
              />
              {editUser.role === 'shop' && (
                <div className="chip-row">
                  {shops.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`chip ${editForm.shopId === s.id ? 'active' : ''}`}
                      onClick={() => setEditForm({ ...editForm, shopId: s.id })}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              {editError && <p className="shake" style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{editError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-outline-gold" onClick={() => setEditUser(null)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-dark">
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">ลบผู้ใช้งานนี้?</h2>
            <div className="modal-actions">
              <button className="btn btn-outline-gold" onClick={() => setConfirmDeleteId(null)}>
                ยกเลิก
              </button>
              <button className="btn btn-dark" style={{ background: 'var(--debt-red)' }} onClick={() => handleDelete(confirmDeleteId)}>
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
