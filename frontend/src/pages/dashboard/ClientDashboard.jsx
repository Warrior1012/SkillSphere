import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Briefcase, Wallet, Building2 } from 'lucide-react';
import { profileApi } from '../../services/profileApi.js';
import { Card, Spinner, Alert, Button } from '../../components/ui.jsx';

export default function ClientDashboard() {
  const { user } = useSelector((s) => s.auth);
  const { data, isLoading, isError } = useQuery({ queryKey: ['my-profile'], queryFn: profileApi.getMine });

  const profile = data?.data?.profile;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Welcome, {user?.name?.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-slate">Here's the state of your account.</p>
      </div>

      {!user?.isEmailVerified && (
        <Alert type="warning">Your email isn't verified yet — posting gigs and payments will require it.</Alert>
      )}

      {isLoading && <Spinner />}
      {isError && <Alert type="error">Couldn't load your profile. Try refreshing.</Alert>}

      {profile && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Briefcase} label="Gigs posted" value={profile.totalGigsPosted ?? 0} />
          <StatCard icon={Wallet} label="Total spent" value={`$${profile.totalSpent ?? 0}`} />
          <StatCard icon={Building2} label="Company" value={profile.companyName || '—'} />
        </div>
      )}

      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">Gig marketplace</h2>
        <p className="mt-2 text-sm text-slate">Post a gig and review proposals from local freelancers.</p>
        <Link to="/gigs/new">
          <Button className="mt-4">Post a gig</Button>
        </Link>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="flex items-center gap-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-clay-soft text-clay">
        <Icon size={18} />
      </span>
      <div>
        <p className="font-mono text-lg font-semibold text-ink">{value}</p>
        <p className="text-xs text-slate">{label}</p>
      </div>
    </Card>
  );
}
