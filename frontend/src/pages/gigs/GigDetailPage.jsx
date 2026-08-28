import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { MapPin, Sparkles, MessageCircle, CheckCircle2 } from 'lucide-react';
import { gigApi, proposalApi } from '../../services/gigApi.js';
import { conversationApi } from '../../services/conversationApi.js';
import { reviewApi } from '../../services/reviewApi.js';
import { paymentApi } from '../../services/paymentApi.js';
import { disputeApi } from '../../services/disputeApi.js';
import { Card, Badge, Button, Input, Spinner, Alert, VerifiedSeal } from '../../components/ui.jsx';

export default function GigDetailPage() {
  const { id } = useParams();
  const { user } = useSelector((s) => s.auth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({ queryKey: ['gig', id], queryFn: () => gigApi.getById(id) });
  const gig = data?.data?.gig;

  const isOwner = gig && user && String(gig.client?._id || gig.client) === String(user._id);
  const isSelectedFreelancer = gig && user && String(gig.selectedFreelancer) === String(user._id);

  async function messageClient() {
    const res = await conversationApi.startOrGet(gig.client._id, gig._id);
    navigate(`/messages/${res.data.conversation._id}`);
  }

  if (isLoading) return <Spinner />;
  if (isError || !gig) return <Alert type="error">Gig not found.</Alert>;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">{gig.title}</h1>
            <p className="mt-1 text-sm text-slate">
              Posted by {gig.client?.name || 'a client'}
              {gig.location?.city && (
                <>
                  {' · '}
                  <MapPin size={11} className="mb-0.5 inline" /> {gig.location.city}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isOwner && user?.role === 'freelancer' && (
              <Button variant="outline" onClick={messageClient}>
                <MessageCircle size={14} /> Message client
              </Button>
            )}
            {isOwner && gig.status === 'in_progress' && <MarkCompleteButton gigId={gig._id} onDone={() => queryClient.invalidateQueries({ queryKey: ['gig', id] })} />}
            <Badge tone={gig.status === 'open' ? 'pine' : gig.status === 'completed' ? 'brass' : 'slate'}>{gig.status.replace('_', ' ')}</Badge>
          </div>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{gig.description}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {gig.skillsRequired?.map((s) => (
            <Badge key={s} tone="pine">
              {s}
            </Badge>
          ))}
        </div>

        <div className="mt-4 flex gap-6 border-t border-slate/15 pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate">Budget</p>
            <p className="font-mono text-sm font-semibold text-ink">
              ${gig.budgetMin}–${gig.budgetMax} ({gig.budgetType})
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate">Type</p>
            <p className="text-sm text-ink">{gig.isRemote ? 'Remote' : 'On-site'}</p>
          </div>
        </div>
      </Card>

      {isOwner && <OwnerPanel gig={gig} />}
      {gig.milestones?.length > 0 && gig.selectedFreelancer && (isOwner || isSelectedFreelancer) && (
        <MilestonesPanel gig={gig} progress={data?.data?.progress ?? 0} isOwner={isOwner} />
      )}
      {gig.selectedFreelancer && (isOwner || isSelectedFreelancer) && (
        <PaymentPanel gig={gig} isOwner={isOwner} />
      )}
      {user?.role === 'freelancer' && !isOwner && gig.status === 'open' && (
        <ProposalForm gigId={gig._id} onSubmitted={() => queryClient.invalidateQueries({ queryKey: ['gig', id] })} />
      )}
      {gig.status === 'completed' && (isOwner || isSelectedFreelancer) && (
        <ReviewSection
          gigId={gig._id}
          revieweeId={isOwner ? gig.selectedFreelancer : gig.client._id || gig.client}
          revieweeLabel={isOwner ? 'the freelancer' : gig.client.name}
        />
      )}
    </div>
  );
}

function MilestonesPanel({ gig, progress, isOwner }) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});

  const FREELANCER_NEXT = { pending: 'Start work', in_progress: 'Submit for review' };
  const CLIENT_NEXT = { submitted: 'Approve' };

  async function advance(milestoneId) {
    setBusyId(milestoneId);
    try {
      await gigApi.updateMilestone(gig._id, milestoneId, noteDrafts[milestoneId] || '');
      toast.success('Milestone updated');
      setNoteDrafts((d) => ({ ...d, [milestoneId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['gig', gig._id] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update milestone');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Progress</h2>
        <p className="font-mono text-sm font-semibold text-brass">{progress}%</p>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-soft">
        <div className="h-full bg-brass transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {gig.milestones.map((m) => {
          const nextLabel = isOwner ? CLIENT_NEXT[m.status] : FREELANCER_NEXT[m.status];
          return (
            <div key={m._id} className="rounded-lg border border-slate/15 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{m.title}</p>
                  <p className="font-mono text-xs text-slate">${m.amount}</p>
                </div>
                <Badge tone={m.status === 'approved' || m.status === 'paid' ? 'pine' : m.status === 'submitted' ? 'brass' : 'slate'}>
                  {m.status.replace('_', ' ')}
                </Badge>
              </div>

              {m.progressLog?.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 border-t border-slate/10 pt-2">
                  {m.progressLog.map((log, i) => (
                    <p key={i} className="text-xs text-slate">
                      {log.note}
                    </p>
                  ))}
                </div>
              )}

              {nextLabel && (
                <div className="mt-2 flex gap-2">
                  <input
                    placeholder="Optional note…"
                    value={noteDrafts[m._id] || ''}
                    onChange={(e) => setNoteDrafts((d) => ({ ...d, [m._id]: e.target.value }))}
                    className="flex-1 rounded-lg border border-slate/30 bg-paper-raised px-3 py-1.5 text-xs outline-none focus:border-brass"
                  />
                  <Button variant="outline" onClick={() => advance(m._id)} loading={busyId === m._id}>
                    {nextLabel}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PaymentPanel({ gig, isOwner }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['gig-payments', gig._id], queryFn: () => paymentApi.forGig(gig._id) });
  const payments = data?.data?.payments || [];
  const [fundAmount, setFundAmount] = useState('');
  const [fundingMilestone, setFundingMilestone] = useState('');
  const [busy, setBusy] = useState(false);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['gig-payments', gig._id] });
  }

  async function handleFund(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await paymentApi.fund({
        gigId: gig._id,
        amount: Number(fundAmount),
        milestoneId: fundingMilestone || undefined,
      });
      toast.success('Funds held in escrow');
      setFundAmount('');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not fund payment');
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease(id) {
    setBusy(true);
    try {
      await paymentApi.release(id);
      toast.success('Payment released to freelancer');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not release payment');
    } finally {
      setBusy(false);
    }
  }

  async function handleRefund(id) {
    setBusy(true);
    try {
      await paymentApi.refund(id);
      toast.success('Payment refunded');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not refund payment');
    } finally {
      setBusy(false);
    }
  }

  async function handleDispute(paymentId) {
    const reason = window.prompt('Briefly describe the issue (an admin will review this):');
    if (!reason || reason.trim().length < 10) {
      if (reason !== null) toast.error('Reason needs to be at least 10 characters');
      return;
    }
    setBusy(true);
    try {
      await disputeApi.raise({ paymentId, reason });
      toast.success('Dispute raised — payment is frozen until an admin reviews it');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not raise dispute');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-ink">Payments</h2>
      <p className="mt-1 text-xs text-slate">
        Provider: <span className="font-mono">{payments[0]?.provider || 'mock'}</span> — see IMPLEMENTATION_REPORT.md for what
        "held" actually means with real providers.
      </p>

      {isLoading && <Spinner />}

      <div className="mt-4 flex flex-col gap-2">
        {payments.map((p) => (
          <div key={p._id} className="flex items-center justify-between rounded-lg border border-slate/15 p-3">
            <div>
              <p className="font-mono text-sm font-semibold text-ink">${p.amount}</p>
              <p className="text-xs text-slate">{p.milestoneId ? 'Milestone payment' : 'Full payment'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={p.status === 'released' ? 'pine' : p.status === 'refunded' ? 'clay' : 'brass'}>{p.status}</Badge>
              {p.status === 'authorized' && (
                <Button variant="ghost" onClick={() => handleDispute(p._id)} disabled={busy}>
                  Raise dispute
                </Button>
              )}
              {isOwner && p.status === 'authorized' && (
                <>
                  <Button variant="brass" onClick={() => handleRelease(p._id)} disabled={busy}>
                    Release
                  </Button>
                  <Button variant="outline" onClick={() => handleRefund(p._id)} disabled={busy}>
                    Refund
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {payments.length === 0 && <p className="text-sm text-slate">No payments yet.</p>}
      </div>

      {isOwner && gig.status !== 'cancelled' && (
        <form onSubmit={handleFund} className="mt-4 flex items-end gap-3 border-t border-slate/15 pt-4">
          {gig.milestones?.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink">Milestone (optional)</label>
              <select
                value={fundingMilestone}
                onChange={(e) => setFundingMilestone(e.target.value)}
                className="rounded-lg border border-slate/30 bg-paper-raised px-3 py-2.5 text-sm outline-none focus:border-brass"
              >
                <option value="">Full payment</option>
                {gig.milestones.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.title} — ${m.amount}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Input label="Amount (USD)" type="number" min="1" required value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} />
          <Button type="submit" loading={busy}>
            Fund
          </Button>
        </form>
      )}
    </Card>
  );
}

function MarkCompleteButton({ gigId, onDone }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try {
      await gigApi.completeGig(gigId);
      toast.success('Gig marked complete');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark complete');
    } finally {
      setLoading(false);
    }
  }
  return (
    <Button variant="brass" onClick={handle} loading={loading}>
      <CheckCircle2 size={14} /> Mark complete
    </Button>
  );
}

function ReviewSection({ gigId, revieweeId, revieweeLabel }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await reviewApi.create({ gigId, revieweeId, rating, comment });
      toast.success('Review submitted');
      setDone(true);
    } catch (err) {
      if (err.response?.status === 409) setDone(true); // already reviewed
      else toast.error(err.response?.data?.message || 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return <Alert type="success">Review submitted for {revieweeLabel}. Thanks.</Alert>;

  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-ink">Leave a review for {revieweeLabel}</h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`h-9 w-9 rounded-lg text-sm font-semibold transition-colors ${
                n <= rating ? 'bg-brass text-ink' : 'bg-slate-soft text-slate'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="How did it go?"
          className="rounded-lg border border-slate/30 bg-paper-raised px-3.5 py-2.5 text-sm outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
        />
        <Button type="submit" loading={submitting} className="self-start">
          Submit review
        </Button>
      </form>
    </Card>
  );
}

function ProposalForm({ gigId, onSubmitted }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await proposalApi.submit(gigId, {
        coverLetter,
        bidAmount: Number(bidAmount),
        estimatedDays: Number(estimatedDays),
      });
      toast.success('Proposal submitted');
      setDone(true);
      onSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit proposal');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return <Alert type="success">Proposal sent — track it from "My Proposals."</Alert>;

  return (
    <Card>
      <h2 className="font-display text-lg font-semibold text-ink">Submit a proposal</h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">Cover letter</label>
          <textarea
            required
            minLength={10}
            rows={4}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            className="rounded-lg border border-slate/30 bg-paper-raised px-3.5 py-2.5 text-sm outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
            placeholder="Why you're a good fit for this gig…"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Bid amount (USD)" type="number" min="0" required value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} />
          <Input label="Estimated days" type="number" min="1" required value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} />
        </div>
        <Button type="submit" loading={submitting}>
          Submit proposal
        </Button>
      </form>
    </Card>
  );
}

function OwnerPanel({ gig }) {
  const [tab, setTab] = useState('proposals');
  const navigate = useNavigate();
  const { data: proposalsData, isLoading: loadingProposals } = useQuery({
    queryKey: ['gig-proposals', gig._id],
    queryFn: () => proposalApi.listForGig(gig._id),
    enabled: tab === 'proposals',
  });
  const { data: matchesData, isLoading: loadingMatches } = useQuery({
    queryKey: ['gig-matches', gig._id],
    queryFn: () => gigApi.recommendedFreelancers(gig._id),
    enabled: tab === 'matches',
  });
  const queryClient = useQueryClient();

  async function act(action, id) {
    try {
      await action(id);
      queryClient.invalidateQueries({ queryKey: ['gig-proposals', gig._id] });
      queryClient.invalidateQueries({ queryKey: ['gig', gig._id] });
      toast.success('Done');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  }

  async function messageFreelancer(freelancerId) {
    const res = await conversationApi.startOrGet(freelancerId, gig._id);
    navigate(`/messages/${res.data.conversation._id}`);
  }

  return (
    <Card>
      <div className="flex gap-2 border-b border-slate/15 pb-3">
        <TabButton active={tab === 'proposals'} onClick={() => setTab('proposals')}>
          Proposals {proposalsData?.data?.proposals?.length ? `(${proposalsData.data.proposals.length})` : ''}
        </TabButton>
        <TabButton active={tab === 'matches'} onClick={() => setTab('matches')}>
          <Sparkles size={13} className="mr-1 inline" /> Recommended freelancers
        </TabButton>
      </div>

      {tab === 'proposals' && (
        <div className="mt-4 flex flex-col gap-3">
          {loadingProposals && <Spinner />}
          {proposalsData?.data?.proposals?.length === 0 && <p className="text-sm text-slate">No proposals yet.</p>}
          {proposalsData?.data?.proposals?.map((p) => (
            <div key={p._id} className="flex items-start justify-between gap-4 rounded-lg border border-slate/15 p-4">
              <div>
                <p className="text-sm font-medium text-ink">{p.freelancer?.name}</p>
                <p className="mt-1 text-sm text-slate">{p.coverLetter}</p>
                <p className="mt-2 font-mono text-xs text-slate">
                  ${p.bidAmount} · {p.estimatedDays} days
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge tone={p.status === 'pending' ? 'brass' : p.status === 'accepted' ? 'pine' : 'clay'}>{p.status}</Badge>
                <Button variant="ghost" onClick={() => messageFreelancer(p.freelancer._id)}>
                  <MessageCircle size={13} /> Message
                </Button>
                {p.status === 'pending' && gig.status === 'open' && (
                  <div className="flex gap-2">
                    <Button variant="brass" onClick={() => act(proposalApi.accept, p._id)}>
                      Accept
                    </Button>
                    <Button variant="outline" onClick={() => act(proposalApi.reject, p._id)}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'matches' && (
        <div className="mt-4 flex flex-col gap-3">
          {loadingMatches && <Spinner />}
          {matchesData?.data?.matches?.length === 0 && <p className="text-sm text-slate">No freelancer profiles to match against yet.</p>}
          {matchesData?.data?.matches?.map((m) => (
            <div key={m.user._id} className="flex items-center justify-between gap-4 rounded-lg border border-slate/15 p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-ink">{m.user.name}</p>
                  {m.profile.verificationBadge && <VerifiedSeal size={14} />}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {m.matchReasons.map((r) => (
                    <Badge key={r} tone="brass">
                      {r}
                    </Badge>
                  ))}
                </div>
                <p className="font-mono text-sm font-semibold text-brass">{m.matchScore}%</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-ink text-paper' : 'text-slate hover:bg-slate-soft/60'
      }`}
    >
      {children}
    </button>
  );
}
