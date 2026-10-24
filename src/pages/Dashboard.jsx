import { useEffect, useState } from 'react';
import client from '../api/client';

export default function Dashboard() {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { client.get('/admin/dashboard').then(({ data: response }) => setData(response.data)).catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load dashboard')); }, []);
  return <main className="admin-shell"><section className="dashboard-content"><p className="eyebrow">Operations overview</p><h1>Dashboard</h1>{error && <p className="form-error" role="alert">{error}</p>}<div className="stat-grid">{[['Generated', data?.generated], ['Active', data?.active], ['Expired', data?.expired], ['Revoked', data?.revoked], ['Inside now', data?.inside]].map(([label, value]) => <div className="stat" key={label}><span>{label}</span><strong>{value ?? '—'}</strong></div>)}</div><section className="trend"><h2>Daily pass generation</h2>{data?.trend?.map((entry) => <div className="trend-row" key={entry.date}><span>{entry.date}</span><strong>{entry.count}</strong></div>)}</section></section></main>;
}