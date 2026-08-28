import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Flag, Trash2, X } from 'lucide-react';
import { adminApi } from '../../services/adminApi.js';
import { Card, Badge, Button, Spinner, Alert } from '../../components/ui.jsx';

export default function FlaggedReviewsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['flagged-reviews'], queryFn: adminApi.flaggedReviews });
  const reviews = data?.data?.reviews || [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['flagged-reviews'] });
  }

  async function dismiss(id) {
    try {
      await adminApi.dismissFlag(id);
      toast.success('Flag dismissed');
      refresh();
    } catch {
      toast.error('Could not dismiss flag');
    }
  }

  async function remove(id) {
    try {
      await adminApi.deleteReview(id);
      toast.success('Review removed');
      refresh();
    } catch {
      toast.error('Could not remove review');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Flagged reviews</h1>
        <p className="mt-1 text-sm text-slate">
          Auto-flagged by real heuristics (new account, suspiciously fast 5-star) — see IMPLEMENTATION_REPORT.md §9.
        </p>
      </div>

      {isLoading && <Spinner />}
      {!isLoading && reviews.length === 0 && (
        <Card>
          <p className="text-sm text-slate">Nothing flagged right now.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {reviews.map((r) => (
          <Card key={r._id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">
                  {r.reviewer?.name} → {r.reviewee?.name}
                </p>
                <p className="text-xs text-slate">{r.gig?.title}</p>
                <p className="mt-2 text-sm text-ink">
                  {r.rating}/5 — {r.comment}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.flagReasons.map((reason) => (
                    <Badge key={reason} tone="clay">
                      <Flag size={10} /> {reason}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={() => dismiss(r._id)}>
                  <X size={13} /> Dismiss
                </Button>
                <Button variant="danger" onClick={() => remove(r._id)}>
                  <Trash2 size={13} /> Remove
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
