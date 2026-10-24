import { useEffect, useState } from 'react';
import client from '../../api/client';
import HistoryPassCard from '../../components/HistoryPassCard';

export default function Dependents() {
  const [dependents, setDependents] = useState([]);
  const [form, setForm] = useState({ name: '', relationship: '', photo: null });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passes, setPasses] = useState({});
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', relationship: '', photo: null });

  async function load() {
    try {
      const { data } = await client.get('/dependents');
      setDependents(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load dependents');
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    const body = new FormData();
    body.append('name', form.name.trim());
    body.append('relationship', form.relationship.trim());
    if (form.photo) body.append('photo', form.photo);
    try {
      await client.post('/dependents', body);
      setForm({ name: '', relationship: '', photo: null });
      setMessage('Dependent submitted for review.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create dependent');
    }
  }

  async function createPass(id) {
    setMessage('');
    setError('');
    try {
      const { data } = await client.post(`/dependents/${id}/pass`);
      setPasses((current) => ({ ...current, [id]: data.data }));
      setMessage('Dependent pass generated successfully.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create pass');
    }
  }

  function startEditing(dependent) {
    setEditing(dependent._id);
    setEditForm({ name: dependent.name, relationship: dependent.relationship, photo: null });
    setMessage('');
    setError('');
  }

  function cancelEditing() {
    setEditing(null);
    setEditForm({ name: '', relationship: '', photo: null });
  }

  async function saveEdit(event, id) {
    event.preventDefault();
    setMessage('');
    setError('');
    const body = new FormData();
    if (editForm.name) body.append('name', editForm.name.trim());
    if (editForm.relationship) body.append('relationship', editForm.relationship.trim());
    if (editForm.photo) body.append('photo', editForm.photo);
    try {
      await client.patch(`/dependents/${id}`, body);
      setMessage('Dependent updated successfully.');
      setEditing(null);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update dependent');
    }
  }

  async function deleteDependent(id, name) {
    if (!window.confirm(`Are you sure you want to permanently delete dependent "${name}"? All associated passes will also be removed.`)) return;
    setMessage('');
    setError('');
    try {
      await client.delete(`/dependents/${id}`);
      setMessage('Dependent deleted successfully.');
      setPasses((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete dependent');
    }
  }

  return (
    <main className="shell">
      <section className="panel wide-panel">
        <p className="eyebrow">Employee workspace</p>
        <h1>Dependents</h1>

        <form onSubmit={submit} className="form-stack inline-form">
          <label>Name
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>Relationship
            <input required value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
          </label>
          <label>Photo
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setForm({ ...form, photo: e.target.files[0] })} />
          </label>
          <button type="submit">Add dependent</button>
        </form>

        {message && <p className="success-message" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="dependent-list">
          {dependents.map((dependent) => (
            <div className="dependent-entry" key={dependent._id}>
              {editing === dependent._id ? (
                <form onSubmit={(e) => saveEdit(e, dependent._id)} className="form-stack dependent-edit-form">
                  <label>Name
                    <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  </label>
                  <label>Relationship
                    <input required value={editForm.relationship} onChange={(e) => setEditForm({ ...editForm, relationship: e.target.value })} />
                  </label>
                  <label>Update photo
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setEditForm({ ...editForm, photo: e.target.files[0] })} />
                  </label>
                  <div className="row-actions">
                    <button type="submit">Save</button>
                    <button type="button" className="sec-clear-btn" onClick={cancelEditing}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="user-row">
                  <div className="dep-item-info">
                    {dependent.photo?.url ? (
                      <img className="dep-avatar" src={dependent.photo.url} alt={dependent.name} />
                    ) : (
                      <div className="dep-avatar-empty">Photo</div>
                    )}
                    <div className="dep-text">
                      <strong>{dependent.name}</strong>
                      <span>{dependent.relationship} · <span className={`status-tag status-${dependent.status}`}>{dependent.status}</span></span>
                    </div>
                  </div>
                  <div className="row-actions">
                    {dependent.status === 'approved' && (
                      <button type="button" onClick={() => createPass(dependent._id)}>Create pass</button>
                    )}
                    {dependent.status === 'pending' && <span className="status-note">Awaiting approval</span>}
                    <button type="button" className="sec-clear-btn" onClick={() => startEditing(dependent)}>Edit</button>
                    <button type="button" className="danger-button" onClick={() => deleteDependent(dependent._id, dependent.name)}>Delete</button>
                  </div>
                </div>
              )}

              {passes[dependent._id] && (
                <div className="dependent-pass-preview">
                  <HistoryPassCard pass={{ ...passes[dependent._id], dependent, passType: 'dependent' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}