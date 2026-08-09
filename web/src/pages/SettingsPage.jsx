import { useRef, useState } from 'react';
import { exportBackupJson, importBackupJson } from '../db/connection.js';
import BottomNav from '../components/BottomNav.jsx';
import useLockBodyScroll from '../hooks/useLockBodyScroll.js';

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function backupWeb(fileName, jsonText) {
  const file = new File([jsonText], fileName, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'สำรองข้อมูลบันทึกหนี้ร้านค้า' });
    return;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [importError, setImportError] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const fileInputRef = useRef(null);
  useLockBodyScroll(!!pendingImport);

  async function handleBackup() {
    setBusy(true);
    setError('');
    setDone(false);
    try {
      const json = await exportBackupJson();
      const fileName = `debt-backup-${timestamp()}.json`;
      await backupWeb(fileName, JSON.stringify(json));
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data?.format !== 'debt-tracker-backup') throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลที่ถูกต้อง');
      setPendingImport({
        data,
        shopCount: data.tables?.shops?.length ?? 0,
        itemCount: data.tables?.items?.length ?? 0,
        exportedAt: data.exportedAt,
      });
    } catch (err) {
      setImportError(err.message);
    }
  }

  async function confirmImport() {
    setImportBusy(true);
    setImportError('');
    try {
      await importBackupJson(pendingImport.data);
      window.location.reload();
    } catch (err) {
      setImportError(err.message);
      setImportBusy(false);
    }
  }

  return (
    <div className="app">
      <div className="light-header">
        <div className="shop-title">ตั้งค่า</div>
      </div>

      <div className="section-pad">
        <div className="add-item-card">
          <div className="add-item-card-title">สำรองข้อมูล</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
            ส่งออกข้อมูลร้านค้า สินค้า และประวัติหนี้ทั้งหมดเป็นไฟล์ .json แล้วเลือกเก็บไว้ที่ไหนก็ได้
            (Files, iCloud Drive, อีเมล, AirDrop ฯลฯ) เก็บไว้เป็นสำเนาสำรอง ไม่ใช่ฐานข้อมูลที่ใช้งานจริง
          </p>
          {error && <p style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{error}</p>}
          {done && <p style={{ color: 'var(--paid-green)', fontSize: 13, margin: 0 }}>สำรองข้อมูลเรียบร้อย</p>}
          <button className="btn btn-dark" disabled={busy} onClick={handleBackup}>
            {busy ? 'กำลังสำรองข้อมูล...' : 'สำรองข้อมูล'}
          </button>
        </div>

        <div className="add-item-card">
          <div className="add-item-card-title">นำเข้าข้อมูล</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
            เลือกไฟล์ .json ที่สำรองไว้ก่อนหน้านี้ เพื่อนำเข้ามาแทนที่ข้อมูลในเครื่องนี้ทั้งหมด
            ใช้เมื่อย้ายเครื่องหรือกู้คืนข้อมูล
          </p>
          {importError && <p style={{ color: 'var(--debt-red)', fontSize: 13, margin: 0 }}>{importError}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleFileChosen}
          />
          <button className="btn btn-outline-gold" onClick={() => fileInputRef.current?.click()}>
            เลือกไฟล์สำรองข้อมูล
          </button>
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <BottomNav />

      {pendingImport && (
        <div className="modal-backdrop" onClick={() => !importBusy && setPendingImport(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">นำเข้าข้อมูลนี้?</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
              พบ {pendingImport.shopCount} ร้านค้า และ {pendingImport.itemCount} สินค้าในไฟล์นี้
              {pendingImport.exportedAt ? ` (สำรองไว้เมื่อ ${new Date(pendingImport.exportedAt).toLocaleString('th-TH')})` : ''}
              <br />
              <strong>ข้อมูลทั้งหมดในเครื่องนี้ตอนนี้จะถูกแทนที่และไม่สามารถย้อนกลับได้</strong>
            </p>
            <div className="modal-actions">
              <button className="btn btn-outline-gold" disabled={importBusy} onClick={() => setPendingImport(null)}>
                ยกเลิก
              </button>
              <button
                className="btn btn-dark"
                style={{ background: 'var(--debt-red)' }}
                disabled={importBusy}
                onClick={confirmImport}
              >
                {importBusy ? 'กำลังนำเข้า...' : 'แทนที่ข้อมูล'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
