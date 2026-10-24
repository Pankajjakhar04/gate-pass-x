import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

const initialForm = {
  employeeId: '',
  fullName: '',
  department: '',
  presentAddress: '',
  permanentAddress: '',
  mobileNumber: '',
  email: '',
  password: '',
  profilePhoto: null,
  idCard: null
};

export default function Registration() {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const profilePhotoInputRef = useRef(null);
  const idCardInputRef = useRef(null);

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = '';
    if (idCardInputRef.current) idCardInputRef.current.value = '';
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value) body.append(key, value);
    });

    try {
      const { data } = await client.post('/registration-requests', body);
      setMessage(data.data.message);
      resetForm();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit registration');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell">
      <section className="panel wide-panel registration-panel">
        <p className="eyebrow">Employee access request</p>
        <h1>Register</h1>
        <p className="intro">Submit your details for admin review. Access is enabled only after approval.</p>

        <form onSubmit={submit} className="registration-grid form-stack">
          <label>
            Employee ID
            <input required value={form.employeeId} onChange={(event) => change('employeeId', event.target.value)} />
          </label>
          <label>
            Full name
            <input required value={form.fullName} onChange={(event) => change('fullName', event.target.value)} />
          </label>
          <label>
            Department
            <input required value={form.department} onChange={(event) => change('department', event.target.value)} />
          </label>
          <label>
            Mobile number
            <input required value={form.mobileNumber} onChange={(event) => change('mobileNumber', event.target.value)} />
          </label>
          <label>
            Email ID
            <input required type="email" value={form.email} onChange={(event) => change('email', event.target.value)} />
          </label>
          <label>
            Password
            <span className="password-field">
              <input
                required
                minLength="10"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => change('password', event.target.value)}
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          <label className="full-field">
            Present address
            <textarea required value={form.presentAddress} onChange={(event) => change('presentAddress', event.target.value)} />
          </label>
          <label className="full-field">
            Permanent address
            <textarea required value={form.permanentAddress} onChange={(event) => change('permanentAddress', event.target.value)} />
          </label>
          <label>
            Profile photo
            <input
              ref={profilePhotoInputRef}
              required
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => change('profilePhoto', event.target.files[0])}
            />
          </label>
          <label>
            ID card upload
            <input
              ref={idCardInputRef}
              required
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => change('idCard', event.target.files[0])}
            />
          </label>
          <button className="full-field" type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Send registration request'}
          </button>
        </form>

        {message && <p className="success-message" role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="form-link">
          <Link to="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  );
}