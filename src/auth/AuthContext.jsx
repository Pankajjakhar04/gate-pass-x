import { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('gate_pass_token');
    if (!token) {
      setLoading(false);
      return undefined;
    }

    client.get('/auth/me')
      .then(({ data }) => setUser(data.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const clearUser = () => setUser(null);
    window.addEventListener('gate-pass-unauthorized', clearUser);
    return () => window.removeEventListener('gate-pass-unauthorized', clearUser);
  }, []);

  async function login(email, password) {
    const { data } = await client.post('/auth/login', { email, password });
    localStorage.setItem('gate_pass_token', data.data.token);
    setUser(data.data.user);
    return data.data.user;
  }

  function logout() {
    localStorage.removeItem('gate_pass_token');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}