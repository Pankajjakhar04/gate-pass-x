import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={`/${user.role}`} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(form.email, form.password);
      navigate(`/${loggedInUser.role}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="shell"><section className="panel login-panel" aria-labelledby="login-title">
    <p className="eyebrow">Identity and visitor management</p><h1 id="login-title">Sign in</h1>
    <p className="intro">Use the account provided by your administrator.</p>
    <form onSubmit={handleSubmit} className="form-stack">
      <label>Email<input type="email" value={form.email} autoComplete="username" required onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
      <label>Password<span className="password-field"><input type={showPassword ? 'text' : 'password'} value={form.password} autoComplete="current-password" required onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</button><p className="form-link"><Link to="/register">Register as an employee</Link></p>
    </form>
  </section></main>;
}