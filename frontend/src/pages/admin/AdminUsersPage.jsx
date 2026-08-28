import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ShieldCheck, Ban, CheckCircle2 } from 'lucide-react';
import { adminApi } from '../../services/adminApi.js';
import { Card, Badge, Button, Input, Spinner } from '../../components/ui.jsx';

export default function AdminUsersPage() {
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', role, q],
    queryFn: () => adminApi.listUsers({ role: role || undefined, q: q || undefined }),
  });
  const users = data?.data?.users || [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  }

  async function toggleSuspend(u) {
    try {
      if (u.isSuspended) await adminApi.activateUser(u._id);
      else await adminApi.suspendUser(u._id, 'Suspended via admin dashboard');
      toast.success(u.isSuspended ? 'User reactivated' : 'User suspended');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  }

  async function verify(u) {
    try {
      await adminApi.verifyFreelancer(u._id);
      toast.success('Freelancer verified');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not verify');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Users</h1>

      <Card className="!p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Input label="Search" placeholder="Name or email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-slate/30 bg-paper-raised px-3 py-2.5 text-sm outline-none focus:border-brass"
            >
              <option value="">All</option>
              <option value="client">Client</option>
              <option value="freelancer">Freelancer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading && <Spinner />}

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <Card key={u._id} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink">{u.name}</p>
                <Badge tone={u.role === 'admin' ? 'brass' : u.role === 'freelancer' ? 'pine' : 'clay'}>{u.role}</Badge>
                {u.isSuspended && <Badge tone="clay">suspended</Badge>}
              </div>
              <p className="text-xs text-slate">{u.email}</p>
            </div>
            <div className="flex gap-2">
              {u.role === 'freelancer' && (
                <Button variant="outline" onClick={() => verify(u)}>
                  <ShieldCheck size={13} /> Verify
                </Button>
              )}
              {u.role !== 'admin' && (
                <Button variant={u.isSuspended ? 'brass' : 'outline'} onClick={() => toggleSuspend(u)}>
                  {u.isSuspended ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                  {u.isSuspended ? 'Reactivate' : 'Suspend'}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
