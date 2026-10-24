import { useEffect, useState } from 'react';
import client from '../../api/client';
import Modal from '../../components/Modal';
import AdminPassPreview from '../../components/AdminPassPreview';

const initialForm = { employeeId: '', name: '', department: '', email: '', password: '' };

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [selected, setSelected] = useState(null);
  const [modalMode, setModalMode] = useState('details');
  const [editForm, setEditForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get('/employees');
      setEmployees(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load employees');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(event) {
    event.preventDefault();
    setError('');
    try {
      // Send as JSON body instead of URLSearchParams
      await client.post('/employees', form);
      setForm(initialForm);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create employee');
    }
  }

  async function toggle(employee) {
    try {
      await client.patch(`/employees/${employee._id}/status`, { isActive: !employee.isActive });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update employee');
    }
  }

  async function openDetails(employee, mode = 'details') {
    setDetailError('');
    try {
      const { data } = await client.get(`/employees/${employee._id}`);
      setSelected(data.data);
      setModalMode(mode);
      setEditForm({
        employeeId: data.data.employee.employeeId,
        name: data.data.employee.name,
        department: data.data.employee.department,
        email: data.data.user?.email || data.data.employee.email,
        password: ''
      });
    } catch (requestError) {
      setDetailError(requestError.response?.data?.message || 'Unable to load employee details');
    }
  }

  async function saveDetails(event) {
    event.preventDefault();
    setDetailError('');
    const body = new FormData();
    Object.entries(editForm).forEach(([key, value]) => {
      if (value) body.append(key, value);
    });
    try {
      await client.patch(`/employees/${selected.employee._id}`, body);
      await openDetails(selected.employee, 'details');
      await load();
    } catch (requestError) {
      setDetailError(requestError.response?.data?.message || 'Unable to update employee');
    }
  }

  return (
    <main className="shell">
      <section className="panel wide-panel">
        <p className="eyebrow">Admin workspace</p>
        <h1>Employees</h1>
        <form onSubmit={create} className="form-stack inline-form">
          <label>
            Employee ID
            <input required value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })} />
          </label>
          <label>
            Name
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Department
            <input required value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
          </label>
          <label>
            Email
            <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Temporary password
            <input required minLength="10" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          <button type="submit">Create employee</button>
        </form>

        {error && <p className="form-error" role="alert">{error}</p>}

        {loading && <p style={{ padding: '1.5rem 0', color: '#666' }}>Loading employees...</p>}

        {!loading && employees.length === 0 && !error && (
          <p style={{ padding: '1.5rem 0', color: '#888', fontStyle: 'italic' }}>No employees registered yet.</p>
        )}

        {!loading && employees.length > 0 && (
          <div className="dependent-list">
            {employees.map((employee) => (
              <div className="user-row" key={employee._id}>
                <span>
                  {employee.employeeId} · {employee.name} · {employee.department} · {employee.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="row-actions">
                  <button type="button" onClick={() => openDetails(employee)}>View details</button>
                  <button type="button" onClick={() => openDetails(employee, 'passes')}>Passes</button>
                  <button type="button" onClick={() => toggle(employee)}>{employee.isActive ? 'Deactivate' : 'Activate'}</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal open={Boolean(selected)} title={modalMode === 'passes' ? 'Employee passes' : 'Employee details'} onClose={() => setSelected(null)}>
        {selected && modalMode === 'passes' && (
          <div className="employee-detail-modal">
            <div className="pass-table">
              {selected.passes.length ? (
                selected.passes.map((pass) => <AdminPassPreview employee={selected.employee} pass={pass} key={pass.id} />)
              ) : (
                <p>No passes created yet.</p>
              )}
            </div>
          </div>
        )}
        {selected && modalMode === 'details' && (
          <div className="employee-detail-modal">
            <div className="request-media">
              <figure>
                {selected.employee.photo?.url ? (
                  <img src={selected.employee.photo.url} alt={selected.employee.name} />
                ) : (
                  <div>No profile photo</div>
                )}
                <figcaption>Profile photo</figcaption>
              </figure>
              <figure>
                {selected.employee.idCard?.url ? (
                  <img src={selected.employee.idCard.url} alt="ID card" />
                ) : (
                  <div>No ID card</div>
                )}
                <figcaption>ID card</figcaption>
              </figure>
            </div>
            <form onSubmit={saveDetails} className="form-stack">
              <label>Employee ID<input readOnly value={editForm.employeeId} /></label>
              <label>Name<input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label>
              <label>Department<input value={editForm.department} onChange={(event) => setEditForm({ ...editForm, department: event.target.value })} /></label>
              <label>Email<input type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} /></label>
              <label>New password<input type="password" minLength="10" placeholder="Leave blank to keep current" value={editForm.password} onChange={(event) => setEditForm({ ...editForm, password: event.target.value })} /></label>
              {detailError && <p className="form-error" role="alert">{detailError}</p>}
              <button type="submit">Save employee details</button>
            </form>
          </div>
        )}
      </Modal>
    </main>
  );
}
