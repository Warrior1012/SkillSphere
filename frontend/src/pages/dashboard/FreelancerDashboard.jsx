import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Star, Briefcase, Eye, FileText } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { profileApi } from '../../services/profileApi.js';
import { Card, Spinner, Alert, Badge, VerifiedSeal } from '../../components/ui.jsx';

export default function FreelancerDashboard() {
  const { user } = useSelector((s) => s.auth);
  const { data, isLoading, isError } = useQuery({ queryKey: ['my-profile'], queryFn: profileApi.getMine });
  const { data: earningsData } = useQuery({ queryKey: ['earnings-timeline'], queryFn: profileApi.getEarningsTimeline });

  const profile = data?.data?.profile;
  const earningsByMonth = earningsData?.data?.earningsByMonth || [];
  const proposalsSubmitted = earningsData?.data?.proposalsSubmitted ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-semibold text-ink">Welcome, {user?.name?.split(' ')[0]}</h1>
        {profile?.verificationBadge && <VerifiedSeal size={20} />}
      </div>

      {!user?.isEmailVerified && (
        <Alert type="warning">Your email isn't verified yet — applying to gigs will require it.</Alert>
      )}

      {isLoading && <Spinner />}
      {isError && <Alert type="error">Couldn't load your profile. Try refreshing.</Alert>}

      {profile && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard icon={Star} label="Reputation" value={profile.reputationScore?.toFixed(1) ?? '0.0'} />
          <StatCard icon={Briefcase} label="Jobs completed" value={profile.totalJobsCompleted ?? 0} />
          <StatCard icon={Eye} label="Profile views" value={profile.profileViews ?? 0} />
          <StatCard icon={FileText} label="Proposals sent" value={proposalsSubmitted} />
        </div>
      )}

      {earningsByMonth.length > 0 && (
        <Card>
          <h2 className="font-display text-sm font-semibold text-ink">Monthly earnings</h2>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#5b647220" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#5b6472' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5b6472' }} />
                <Tooltip formatter={(v) => [`$${v}`, 'Earned']} />
                <Bar dataKey="total" fill="#1f5c4f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {profile && profile.skills?.length === 0 && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Your profile is empty</h2>
          <p className="mt-2 text-sm text-slate">
            Add skills, a headline, and your experience so clients can find you once search goes live.
          </p>
        </Card>
      )}

      {profile && profile.skills?.length > 0 && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-ink">Skills</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <Badge key={s.name} tone="pine">
                {s.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="flex items-center gap-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pine-soft text-pine">
        <Icon size={18} />
      </span>
      <div>
        <p className="font-mono text-lg font-semibold text-ink">{value}</p>
        <p className="text-xs text-slate">{label}</p>
      </div>
    </Card>
  );
}
