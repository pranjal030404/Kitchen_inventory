import React, { useState } from 'react';
import { api, setToken } from '../api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api.login(email, password);
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div className="logo login-logo"><div className="logo-mark">🍳</div>KitchenStock</div>
        <p className="sub">Sign in to manage your kitchen.</p>
        {error && <div className="err">{error}</div>}
        <div className="field"><label>EMAIL</label><input type="email" required autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label>PASSWORD</label><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
