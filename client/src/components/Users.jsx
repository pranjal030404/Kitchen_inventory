import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { dateFmt } from '../utils.js';

export default function Users({ me, notify }) {
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null); // null | {} (new) | user
  const [error, setError] = useState('');

  const load = () => api.users().then(setUsers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const run = async (fn, msg) => {
    try {
      await fn();
      await load();
      notify(msg);
      return true;
    } catch (e) {
      notify(e.message);
      return false;
    }
  };

  const remove = (u) => {
    if (window.confirm(`Delete ${u.name}? Their inventory (${u.itemCount} items) will be deleted too.`))
      run(() => api.deleteUser(u.id), 'User deleted');
  };

  return (
    <section className="card section">
      <div className="section-head">
        <div><h2>Users</h2><p>Create accounts for family members and manage access</p></div>
        <button className="btn primary" onClick={() => setEditing({})}>+ Add user</button>
      </div>
      {error && <div className="err">{error}</div>}
      <div className="table-wrap">
        <table className="table stack">
          <thead><tr><th>Name</th><th>Role</th><th>Items</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Name"><b>{u.name}</b>{u.id === me.id && ' (you)'}<div className="muted">{u.email}</div></td>
                <td data-label="Role"><span className={`pill ${u.role === 'admin' ? 'orange' : 'green'}`}>{u.role}</span></td>
                <td data-label="Items">{u.itemCount}</td>
                <td data-label="Joined">{dateFmt(String(u.createdAt).slice(0, 10))}</td>
                <td data-label="Status"><span className={`pill ${u.active ? 'green' : 'red'}`}>{u.active ? 'Active' : 'Disabled'}</span></td>
                <td data-label="Actions">
                  <div className="actions-cell">
                    <button className="icon-btn" title="Edit" onClick={() => setEditing(u)}>✎</button>
                    {u.id !== me.id && (
                      <>
                        <button className="icon-btn" title={u.active ? 'Disable' : 'Enable'} onClick={() => run(() => api.updateUser(u.id, { active: !u.active }), u.active ? 'User disabled' : 'User enabled')}>{u.active ? '⏸' : '▶'}</button>
                        <button className="icon-btn" title="Delete" onClick={() => remove(u)}>🗑</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <UserModal user={editing} isSelf={editing.id === me.id} onClose={() => setEditing(null)}
        onSave={async (data) => {
          const ok = await run(() => (editing.id ? api.updateUser(editing.id, data) : api.addUser(data)), editing.id ? 'User updated' : 'User created');
          if (ok) setEditing(null);
          return ok;
        }} />}
    </section>
  );
}

function UserModal({ user, isSelf, onSave, onClose }) {
  const isNew = !user.id;
  const [f, setF] = useState({ name: user.name || '', email: user.email || '', role: user.role || 'user', password: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = { ...f };
    if (!body.password) delete body.password;
    if (isSelf) delete body.role;
    if (!(await onSave(body))) setBusy(false);
  };

  return (
    <div className="modal-bg open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal small">
        <div className="modal-head"><h2>{isNew ? 'Add user' : 'Edit user'}</h2><button className="icon-btn" onClick={onClose}>✕</button></div>
        <form className="form one" onSubmit={submit}>
          <div className="field"><label>NAME *</label><input required value={f.name} onChange={set('name')} /></div>
          <div className="field"><label>EMAIL *</label><input required type="email" value={f.email} onChange={set('email')} /></div>
          <div className="field"><label>{isNew ? 'PASSWORD * (min 8 characters)' : 'NEW PASSWORD (leave blank to keep)'}</label>
            <input type="password" required={isNew} minLength={8} autoComplete="new-password" value={f.password} onChange={set('password')} /></div>
          <div className="field"><label>ROLE</label>
            <select value={f.role} onChange={set('role')} disabled={isSelf}><option value="user">User</option><option value="admin">Admin</option></select></div>
          <div className="modal-foot"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>Save</button></div>
        </form>
      </div>
    </div>
  );
}
