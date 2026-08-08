import { useState } from 'react';
import { exportBackupJson } from '../db/connection.js';
import BottomNav from '../components/BottomNav.jsx';

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
      </div>

      <div style={{ flex: 1 }} />
      <BottomNav />
    </div>
  );
}
