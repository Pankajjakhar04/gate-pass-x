import { useEffect, useState } from 'react';
import client from '../../api/client';
import Modal from '../../components/Modal';

export default function RegistrationRequests() {
  const [requests, setRequests] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [registrationResponse, updateResponse] = await Promise.all([
        client.get('/admin/registration-requests'),
        client.get('/admin/employee-update-requests')
      ]);
      setRequests(registrationResponse.data.data);
      setUpdates(updateResponse.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load approval requests');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decideRegistration(id, approved) {
    try {
      await client.patch(`/admin/registration-requests/${id}/${approved ? 'approve' : 'reject'}`, approved ? {} : { reason: 'Details did not pass review' });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to review registration');
    }
  }

  async function decideUpdate(id, approved) {
    try {
      await client.patch(`/admin/employee-update-requests/${id}/${approved ? 'approve' : 'reject'}`, approved ? {} : { reason: 'Details did not pass review' });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to review profile update');
    }
  }

  return (
    <main className="shell">
      <section className="panel wide-panel">
        <p className="eyebrow">Admin workspace</p>
        <h1>Approval requests</h1>

        {error && <p className="form-error" role="alert">{error}</p>}

        {loading && <p style={{ padding: '1.5rem 0', color: '#666' }}>Loading requests...</p>}

        {!loading && (
          <>
            <h2>Employee registrations</h2>
            {requests.length === 0 ? (
              <p style={{ padding: '0.75rem 0 1.5rem', color: '#888', fontStyle: 'italic' }}>No pending registrations.</p>
            ) : (
              <div className="dependent-list">
                {requests.map((item) => (
                  <div className="approval-row" key={item._id}>
                    <div>
                      <strong>{item.fullName}</strong>
                      <span>{item.employeeId} · {item.department} · {item.email}</span>
                      <span>{item.presentAddress}</span>
                    </div>
                    <div>
                      <button type="button" onClick={() => setSelected(item)}>View details</button>
                      <button type="button" onClick={() => decideRegistration(item._id, true)}>Approve</button>
                      <button type="button" className="danger-button" onClick={() => decideRegistration(item._id, false)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h2>Employee profile updates</h2>
            {updates.length === 0 ? (
              <p style={{ padding: '0.75rem 0 1.5rem', color: '#888', fontStyle: 'italic' }}>No pending profile updates.</p>
            ) : (
              <div className="dependent-list">
                {updates.map((item) => (
                  <div className="approval-row" key={item._id}>
                    <div>
                      <strong>{item.employee?.name}</strong>
                      <span>{Object.keys(item.changes || {}).join(', ')}</span>
                      <span>{item.proof ? 'Proof attached' : 'No proof attached'}</span>
                    </div>
                    <div>
                      <button type="button" onClick={() => decideUpdate(item._id, true)}>Approve</button>
                      <button type="button" className="danger-button" onClick={() => decideUpdate(item._id, false)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <Modal open={Boolean(selected)} title="Registration details" onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="request-media">
              <figure>
                {selected.profilePhoto?.url ? <img src={selected.profilePhoto.url} alt="Profile" /> : <div>No profile photo</div>}
                <figcaption>Profile photo</figcaption>
              </figure>
              <figure>
                {selected.idCard?.url ? <img src={selected.idCard.url} alt="ID card" /> : <div>No ID card</div>}
                <figcaption>ID card</figcaption>
              </figure>
            </div>
            <dl className="request-details">
              <div><dt>Full name</dt><dd>{selected.fullName}</dd></div>
              <div><dt>Employee ID</dt><dd>{selected.employeeId}</dd></div>
              <div><dt>Department</dt><dd>{selected.department}</dd></div>
              <div><dt>Email</dt><dd>{selected.email}</dd></div>
              <div><dt>Mobile</dt><dd>{selected.mobileNumber}</dd></div>
              <div><dt>Present address</dt><dd>{selected.presentAddress}</dd></div>
              <div><dt>Permanent address</dt><dd>{selected.permanentAddress}</dd></div>
            </dl>
          </>
        )}
      </Modal>
    </main>
  );
}