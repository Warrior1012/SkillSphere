import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Scale } from 'lucide-react';
import { adminDisputeApi } from '../../services/disputeApi.js';
import { Card, Badge, Button, Spinner } from '../../components/ui.jsx';

export default function AdminDisputesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-disputes'], queryFn: () => adminDisputeApi.list('open') });
  const disputes = data?.data?.disputes || [];
  const [resolving, setResolving] = useState(null);
  const [notes, setNotes] = useState({});

  async function resolve(id, action) {
    const resolution = notes[id];
    if (!resolution || resolution.trim().length < 5) {
      toast.error('Add a resolution note (5+ characters) first');
      return;
    }
    setResolving(id);
    try {
      await adminDisputeApi.resolve(id, { resolution, action });
      toast.success('Dispute resolved');
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resolve dispute');
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Disputes</h1>
        <p className="mt-1 text-sm text-slate">
          Raising a dispute freezes the underlying payment — nothing releases until resolved here.
        </p>
      </div>

      {isLoading && <Spinner />}
      {!isLoading && disputes.length === 0 && (
        <Card>
          <p className="text-sm text-slate">No open disputes.</p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {disputes.map((d) => (
          <Card key={d._id}>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-soft text-clay">
                <Scale size={16} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">
                  {d.raisedBy?.name} vs {d.against?.name} — {d.gig?.title}
                </p>
                <p className="mt-1 text-sm text-ink">{d.reason}</p>
                <p className="mt-1 font-mono text-xs text-slate">
                  Payment: ${d.payment?.amount} · {d.payment?.status}
                </p>

                <textarea
                  rows={2}
                  placeholder="Resolution note (shown to both parties)…"
                  value={notes[d._id] || ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [d._id]: e.target.value }))}
                  className="mt-3 w-full rounded-lg border border-slate/30 bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass"
                />
                <div className="mt-2 flex gap-2">
                  <Button variant="brass" onClick={() => resolve(d._id, 'released')} loading={resolving === d._id}>
                    Resolve — release to freelancer
                  </Button>
                  <Button variant="outline" onClick={() => resolve(d._id, 'refunded')} loading={resolving === d._id}>
                    Resolve — refund client
                  </Button>
                  <Button variant="ghost" onClick={() => resolve(d._id, 'none')} loading={resolving === d._id}>
                    Resolve — no action
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
