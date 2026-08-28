import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Card, Badge, Spinner, Alert } from '../../components/ui.jsx';
import { paymentApi } from '../../services/paymentApi.js';

const STATUS_TONE = { created: 'slate', authorized: 'brass', released: 'pine', refunded: 'clay', failed: 'clay' };

export default function PaymentsPage() {
  const { user } = useSelector((s) => s.auth);
  const { data, isLoading, isError } = useQuery({ queryKey: ['my-payments'], queryFn: paymentApi.mine });
  const payments = data?.data?.payments || [];

  const total = payments.filter((p) => p.status === 'released').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{user?.role === 'freelancer' ? 'Earnings' : 'Payments'}</h1>
        <p className="mt-1 font-mono text-sm text-slate">
          Total {user?.role === 'freelancer' ? 'earned' : 'spent'}: <span className="font-semibold text-ink">${total}</span>
        </p>
      </div>

      {isLoading && <Spinner />}
      {isError && <Alert type="error">Couldn't load payments.</Alert>}
      {!isLoading && payments.length === 0 && (
        <Card>
          <p className="text-sm text-slate">No transactions yet.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {payments.map((p) => (
          <Card key={p._id} className="flex items-center justify-between">
            <div>
              <Link to={`/gigs/${p.gig?._id}`} className="font-display text-sm font-semibold text-ink hover:underline">
                {p.gig?.title || 'Gig'}
              </Link>
              <p className="mt-1 font-mono text-xs text-slate">
                {p.provider} · {new Date(p.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-mono text-sm font-semibold text-ink">${p.amount}</p>
              <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
