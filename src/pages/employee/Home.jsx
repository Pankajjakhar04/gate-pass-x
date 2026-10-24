import { useEffect, useState } from 'react';
import client from '../../api/client';
import PassCard from '../../components/PassCard';

export default function EmployeeHome() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/employees/me')
      .then(({ data: response }) => setData(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load employee pass'));
  }, []);

  return (
    <main className="employee-shell">
      {error && <p className="form-error" role="alert">{error}</p>}
      {!data && !error && <p>Loading your pass...</p>}
      {data && (
        <div className="pass-layout">
          <div>
            <p className="eyebrow">Identity pass</p>
            <h1>{data.employee.name}</h1>
            <p className="intro">
              {data.pass
                ? 'Keep this pass available when entering or leaving the premises.'
                : 'Your profile is active, but an identity pass has not yet been issued or has expired.'}
            </p>
          </div>
          <PassCard employee={data.employee} pass={data.pass} />
        </div>
      )}
    </main>
  );
}