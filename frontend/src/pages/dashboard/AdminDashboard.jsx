import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { DollarSign, Users, Briefcase, TrendingUp, Flag, Scale } from 'lucide-react';
import { adminApi } from '../../services/adminApi.js';
import { Card, Spinner, Alert, Badge, Button } from '../../components/ui.jsx';

export default function AdminDashboard() {
  const { user } = useSelector((s) => s.auth);
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-analytics'], queryFn: adminApi.analytics });
  const a = data?.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Admin — {user?.name}</h1>
        <p className="mt-1 text-sm text-slate">Real platform metrics, computed from live data.</p>
      </div>

      {isLoading && <Spinner />}
      {isError && <Alert type="error">Couldn't load analytics.</Alert>}

      {a && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <StatCard icon={DollarSign} label="Platform revenue (released)" value={`$${a.platformRevenue}`} />
            <StatCard icon={Users} label="Active freelancers" value={a.activeFreelancers} />
            <StatCard icon={Briefcase} label="Total gigs" value={a.totalGigs} />
            <StatCard icon={TrendingUp} label="Job success rate" value={`${a.jobSuccessRate}%`} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <h2 className="font-display text-sm font-semibold text-ink">Top categories</h2>
              <div className="mt-3 flex flex-col gap-2">
                {a.topCategories.length === 0 && <p className="text-sm text-slate">No categorized gigs yet.</p>}
                {a.topCategories.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{c.category}</span>
                    <span className="font-mono text-slate">{c.count}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="font-display text-sm font-semibold text-ink">Gigs by status</h2>
              <div className="mt-3 flex flex-col gap-2">
                {a.gigStatusBreakdown.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-sm">
                    <Badge tone="slate">{s.status.replace('_', ' ')}</Badge>
                    <span className="font-mono text-slate">{s.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-soft text-clay">
              <Flag size={16} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">Flagged reviews</p>
              <p className="text-xs text-slate">Fraud-signal queue — real heuristics, not decoration</p>
            </div>
          </div>
          <Link to="/admin/flagged-reviews">
            <Button variant="outline">Review queue</Button>
          </Link>
        </Card>

        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brass-soft text-brass">
              <Scale size={16} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">Disputes</p>
              <p className="text-xs text-slate">Raising one freezes the payment until resolved here</p>
            </div>
          </div>
          <Link to="/admin/disputes">
            <Button variant="outline">Review queue</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="flex items-center gap-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brass-soft text-brass">
        <Icon size={18} />
      </span>
      <div>
        <p className="font-mono text-lg font-semibold text-ink">{value}</p>
        <p className="text-xs text-slate">{label}</p>
      </div>
    </Card>
  );
}
