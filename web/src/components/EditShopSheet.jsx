import { useState } from 'react';
import { api as customerApi } from '../api.js';
import useLockBodyScroll from '../hooks/useLockBodyScroll.js';

export default function EditShopSheet({ shop, onClose, onSaved, onDeleted, api = customerApi }) {
  useLockBodyScroll();
  const [name, setName] = useState(shop.name);
  const [phone, setPhone] = useState(shop.phone ?? '');
  const [note, setNote] = useState(shop.note ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const canDelete = shop.outstandingDebt === 0;

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.updateShop(shop.id, { name: name.trim(), phone, note });
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await api.deleteShop(shop.id);
      onDeleted?.();
    } catch (err) {
      setError(err.message);
      setBusy(false);
      setShowConfirmDelete(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">จัดการร้าน</div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field-group">
            <div className="field-label">ชื่อร้าน</div>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field-group">
            <div className="field-label">เบอร์โทร</div>
            <input className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="081-234-5678" />
          </div>
          <div className="field-group">
            <div className="field-label">โน้ตประจำร้าน</div>
            <textarea
              className="field-input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น เก็บเงินทุกวันเสาร์"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {error && <p style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}

          <button type="submit" className="btn btn-dark" disabled={busy}>
            บันทึกการแก้ไข
          </button>
        </form>

        <div style={{ borderTop: '1px solid #E6DAC3', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn-danger-text"
            disabled={!canDelete || busy}
            onClick={() => setShowConfirmDelete(true)}
            style={{ textAlign: 'center' }}
          >
            ลบร้านนี้
          </button>
          <div style={{ fontSize: 12, color: 'var(--muted-soft)', textAlign: 'center', lineHeight: 1.6 }}>
            {canDelete ? 'ประวัติทั้งหมดจะถูกลบถาวร' : 'ลบได้เมื่อไม่มีหนี้ค้าง ประวัติทั้งหมดจะถูกลบถาวร'}
          </div>
        </div>
      </div>

      {showConfirmDelete && (
        <div className="modal-backdrop" onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">ลบร้าน "{shop.name}"?</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>ประวัติทั้งหมดของร้านนี้จะถูกลบถาวร ไม่สามารถกู้คืนได้</p>
            <div className="modal-actions">
              <button className="btn btn-outline-gold" disabled={busy} onClick={() => setShowConfirmDelete(false)}>
                ยกเลิก
              </button>
              <button className="btn btn-dark" style={{ background: 'var(--debt-red)' }} disabled={busy} onClick={confirmDelete}>
                ลบร้านนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
