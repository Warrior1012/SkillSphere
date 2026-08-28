import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Search, MapPin, Plus } from 'lucide-react';
import { gigApi } from '../../services/gigApi.js';
import { Card, Input, Button, Badge, Spinner, Alert } from '../../components/ui.jsx';

export default function GigMarketplacePage() {
  const { user } = useSelector((s) => s.auth);
  const [filters, setFilters] = useState({ q: '', skill: '', isRemote: '' });
  const [appliedFilters, setAppliedFilters] = useState({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['gigs', appliedFilters],
    queryFn: () => gigApi.list(appliedFilters),
  });

  function applyFilters(e) {
    e.preventDefault();
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    setAppliedFilters(clean);
  }

  const gigs = data?.data?.gigs || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {user?.role === 'freelancer' ? 'Find work' : 'Gig marketplace'}
          </h1>
          <p className="mt-1 text-sm text-slate">{data?.data?.total ?? 0} open gigs</p>
        </div>
        {user?.role === 'client' && (
          <Link to="/gigs/new">
            <Button>
              <Plus size={16} /> Post a gig
            </Button>
          </Link>
        )}
      </div>

      <Card className="!p-4">
        <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Input
              label="Search"
              placeholder="e.g. React developer"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </div>
          <div className="min-w-[160px]">
            <Input
              label="Skill"
              placeholder="e.g. plumbing"
              value={filters.skill}
              onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
            />
          </div>
          <Button type="submit" variant="outline">
            <Search size={14} /> Filter
          </Button>
        </form>
      </Card>

      {isLoading && <Spinner />}
      {isError && <Alert type="error">Couldn't load gigs.</Alert>}
      {!isLoading && gigs.length === 0 && (
        <Card>
          <p className="text-sm text-slate">No open gigs match that search yet.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {gigs.map((gig) => (
          <Link key={gig._id} to={`/gigs/${gig._id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">{gig.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate">{gig.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {gig.skillsRequired?.slice(0, 5).map((s) => (
                      <Badge key={s} tone="pine">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-semibold text-ink">
                    ${gig.budgetMin}–${gig.budgetMax}
                  </p>
                  <p className="text-xs text-slate">{gig.budgetType}</p>
                  <p className="mt-2 flex items-center justify-end gap-1 text-xs text-slate">
                    {gig.isRemote ? 'Remote' : (
                      <>
                        <MapPin size={11} /> {gig.location?.city || 'Local'}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
