import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { authApi } from '../../services/authApi.js';
import { Spinner } from '../../components/ui.jsx';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // 'loading' | 'success' | 'error'

  useEffect(() => {
    let cancelled = false;
    authApi
      .verifyEmail(token)
      .then(() => !cancelled && setState('success'))
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'loading') return <Spinner />;

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2 className="h-10 w-10 text-pine" />
        <h1 className="font-display text-xl font-semibold text-ink">Email verified</h1>
        <Link to="/login" className="text-sm font-medium text-brass hover:underline">
          Continue to login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <XCircle className="h-10 w-10 text-clay" />
      <h1 className="font-display text-xl font-semibold text-ink">Link invalid or expired</h1>
      <Link to="/login" className="text-sm font-medium text-brass hover:underline">
        Back to login
      </Link>
    </div>
  );
}
