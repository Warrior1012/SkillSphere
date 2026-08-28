import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { gigApi } from '../../services/gigApi.js';
import { Card, Badge, Button, Spinner, Alert } from '../../components/ui.jsx';

const STATUS_TONE = { open: 'pine', in_progress: 'brass', completed: 'slate', cancelled: 'clay' };

export default function MyGigsPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['my-gigs'], queryFn: gigApi.mine });
  const gigs = data?.data?.gigs || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">My gigs</h1>
        <Link to="/gigs/new">
          <Button>
            <Plus size={16} /> Post a gig
          </Button>
        </Link>
      </div>

      {isLoading && <Spinner />}
      {isError && <Alert type="error">Couldn't load your gigs.</Alert>}
      {!isLoading && gigs.length === 0 && (
        <Card>
          <p className="text-sm text-slate">You haven't posted any gigs yet.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {gigs.map((gig) => (
          <Link key={gig._id} to={`/gigs/${gig._id}`}>
            <Card className="flex items-center justify-between transition-shadow hover:shadow-md">
              <div>
                <h3 className="font-display text-base font-semibold text-ink">{gig.title}</h3>
                <p className="mt-1 font-mono text-xs text-slate">
                  ${gig.budgetMin}–${gig.budgetMax} · {gig.proposalsCount} proposal{gig.proposalsCount === 1 ? '' : 's'}
                </p>
              </div>
              <Badge tone={STATUS_TONE[gig.status]}>{gig.status.replace('_', ' ')}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
