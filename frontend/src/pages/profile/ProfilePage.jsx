import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Pencil, MapPin, Star } from 'lucide-react';
import { profileApi } from '../../services/profileApi.js';
import { reviewApi } from '../../services/reviewApi.js';
import { Card, Spinner, Alert, Badge, VerifiedSeal, Button } from '../../components/ui.jsx';

export default function ProfilePage() {
  const { user } = useSelector((s) => s.auth);
  const { data, isLoading, isError } = useQuery({ queryKey: ['my-profile'], queryFn: profileApi.getMine });
  const { data: reviewsData } = useQuery({
    queryKey: ['my-reviews', user?._id],
    queryFn: () => reviewApi.forUser(user._id),
    enabled: !!user?._id,
  });

  if (isLoading) return <Spinner />;
  if (isError) return <Alert type="error">Couldn't load your profile.</Alert>;

  const profile = data?.data?.profile;
  const isFreelancer = user?.role === 'freelancer';

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-soft text-xl font-semibold text-ink">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user?.name?.[0]}
            {profile?.verificationBadge && (
              <span className="absolute -bottom-1 -right-1">
                <VerifiedSeal size={20} />
              </span>
            )}
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-ink">{user?.name}</h1>
            {isFreelancer && profile?.headline && <p className="text-sm text-slate">{profile.headline}</p>}
            {user?.location?.city && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate">
                <MapPin size={12} /> {user.location.city}
              </p>
            )}
          </div>
        </div>
        <Link to="/profile/edit">
          <Button variant="outline">
            <Pencil size={14} /> Edit
          </Button>
        </Link>
      </Card>

      {isFreelancer ? <FreelancerDetails profile={profile} /> : <ClientDetails profile={profile} />}

      <ReviewsList reviews={reviewsData?.data?.reviews} />
    </div>
  );
}

function ReviewsList({ reviews }) {
  if (!reviews) return null;
  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-ink">Reviews ({reviews.length})</h2>
      {reviews.length === 0 ? (
        <p className="mt-2 text-sm text-slate">No reviews yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-4">
          {reviews.map((r) => (
            <div key={r._id} className="border-b border-slate/10 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">{r.reviewer?.name}</p>
                <div className="flex items-center gap-1 text-brass">
                  <Star size={13} fill="currentColor" />
                  <span className="font-mono text-xs">{r.rating}/5</span>
                </div>
              </div>
              {r.gig?.title && <p className="text-xs text-slate">{r.gig.title}</p>}
              {r.comment && <p className="mt-1.5 text-sm text-ink">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function FreelancerDetails({ profile }) {
  if (!profile) return null;
  return (
    <>
      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">About</h2>
        <p className="mt-2 text-sm text-slate">{profile.bio || 'No bio yet.'}</p>
      </Card>
      <Card>
        <h2 className="font-display text-lg font-semibold text-ink">Skills</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.skills?.length ? (
            profile.skills.map((s) => (
              <Badge key={s.name} tone="pine">
                {s.name} · {s.proficiency}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-slate">No skills added yet.</p>
          )}
        </div>
      </Card>
      <Card className="flex flex-wrap gap-6">
        <Detail label="Pricing" value={profile.pricingModel} />
        <Detail label="Hourly rate" value={profile.hourlyRate ? `$${profile.hourlyRate}/hr` : '—'} />
        <Detail label="Reputation" value={profile.reputationScore?.toFixed(1) ?? '0.0'} />
      </Card>
    </>
  );
}

function ClientDetails({ profile }) {
  if (!profile) return null;
  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-ink">Company</h2>
      <div className="mt-3 flex flex-wrap gap-6">
        <Detail label="Company name" value={profile.companyName || '—'} />
        <Detail label="Industry" value={profile.industry || '—'} />
      </div>
      <p className="mt-4 text-sm text-slate">{profile.bio || 'No bio yet.'}</p>
    </Card>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-ink">{value}</p>
    </div>
  );
}
