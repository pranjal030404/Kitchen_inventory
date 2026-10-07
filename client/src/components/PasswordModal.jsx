import React, { useState } from 'react';
import { api } from '../api.js';

export default function PasswordModal({ onClose, notify }) {
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.changePassword(cur, next);
      notify('Password changed');
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-bg open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal small">
        <div className="modal-head"><h2>Change password</h2><button className="icon-btn" onClick={onClose}>✕</button></div>
        <form className="form one" onSubmit={submit}>
          {error && <div className="err">{error}</div>}
          <div className="field"><label>CURRENT PASSWORD</label><input type="password" required autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
          <div className="field"><label>NEW PASSWORD (min 8 characters)</label><input type="password" required minLength={8} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></div>
          <div className="modal-foot"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Update</button></div>
        </form>
      </div>
    </div>
  );
}
