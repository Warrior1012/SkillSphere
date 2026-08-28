import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { proposalApi } from '../../services/gigApi.js';
import { Card, Badge, Button, Spinner, Alert } from '../../components/ui.jsx';

const STATUS_TONE = { pending: 'brass', accepted: 'pine', rejected: 'clay', withdrawn: 'slate' };

export default function MyProposalsPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['my-proposals'], queryFn: proposalApi.mine });
  const queryClient = useQueryClient();
  const proposals = data?.data?.proposals || [];

  async function withdraw(id) {
    try {
      await proposalApi.withdraw(id);
      queryClient.invalidateQueries({ queryKey: ['my-proposals'] });
      toast.success('Proposal withdrawn');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not withdraw');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink">My proposals</h1>

      {isLoading && <Spinner />}
      {isError && <Alert type="error">Couldn't load your proposals.</Alert>}
      {!isLoading && proposals.length === 0 && (
        <Card>
          <p className="text-sm text-slate">
            You haven't submitted any proposals yet.{' '}
            <Link to="/gigs" className="font-medium text-brass hover:underline">
              Browse open gigs
            </Link>
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {proposals.map((p) => (
          <Card key={p._id} className="flex items-center justify-between">
            <div>
              <Link to={`/gigs/${p.gig?._id}`} className="font-display text-base font-semibold text-ink hover:underline">
                {p.gig?.title || 'Gig no longer available'}
              </Link>
              <p className="mt-1 font-mono text-xs text-slate">
                ${p.bidAmount} · {p.estimatedDays} days
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
              {p.status === 'pending' && (
                <Button variant="outline" onClick={() => withdraw(p._id)}>
                  Withdraw
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
