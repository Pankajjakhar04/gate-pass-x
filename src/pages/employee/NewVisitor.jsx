import { useState } from 'react';
import client from '../../api/client';
import VisitorPassCard from '../../components/VisitorPassCard';

export default function NewVisitor() {
  const [form, setForm] = useState({ name: '', phone: '', purpose: '', validityHours: 24, photo: null });
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault(); setSubmitting(true); setError('');
    const body = new FormData(); Object.entries(form).forEach(([key, value]) => { if (value) body.append(key, value); });
    try { const { data } = await client.post('/passes/visitor', body); setCreated(data.data); setForm({ name: '', phone: '', purpose: '', validityHours: 24, photo: null }); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to create visitor pass'); }
    finally { setSubmitting(false); }
  }

  return <main className="shell"><section className="panel wide-panel"><p className="eyebrow">Employee workspace</p><h1>New visitor pass</h1>
    <form onSubmit={submit} className="form-stack visitor-form"><label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>Purpose<input value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} /></label><label>Validity hours<input type="number" min="1" max="24" value={form.validityHours} onChange={(event) => setForm({ ...form, validityHours: event.target.value })} /></label><label>Photo<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setForm({ ...form, photo: event.target.files[0] })} /></label><button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create visitor pass'}</button></form>
    {error && <p className="form-error" role="alert">{error}</p>}{created && <div className="created-pass"><p role="status">Pass created.</p><VisitorPassCard visitor={created.visitor} pass={created.pass} /></div>}
  </section></main>;
}