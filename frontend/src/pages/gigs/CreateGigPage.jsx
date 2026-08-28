import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { X, Plus } from 'lucide-react';
import { gigApi } from '../../services/gigApi.js';
import { Card, Input, Button } from '../../components/ui.jsx';

export default function CreateGigPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    budgetType: 'fixed',
    budgetMin: '',
    budgetMax: '',
    isRemote: true,
    city: '',
  });
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function addSkill() {
    const s = newSkill.trim();
    if (!s || skills.includes(s)) return;
    setSkills([...skills, s]);
    setNewSkill('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await gigApi.create({
        ...form,
        budgetMin: Number(form.budgetMin) || 0,
        budgetMax: Number(form.budgetMax) || 0,
        skillsRequired: skills,
      });
      toast.success('Gig posted');
      navigate(`/gigs/${res.data.gig._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post gig — check the details');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Post a gig</h1>

      <Card className="flex flex-col gap-4">
        <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">Description</label>
          <textarea
            required
            minLength={20}
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg border border-slate/30 bg-paper-raised px-3.5 py-2.5 text-sm outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink">Skills required</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="flex items-center gap-1 rounded-full bg-pine-soft px-2.5 py-1 text-xs text-pine">
                {s}
                <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="e.g. React, plumbing, tutoring…"
              className="flex-1 rounded-lg border border-slate/30 bg-paper-raised px-3.5 py-2 text-sm outline-none focus:border-brass"
            />
            <Button type="button" variant="outline" onClick={addSkill}>
              <Plus size={14} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Budget min (USD)" type="number" min="0" value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} />
          <Input label="Budget max (USD)" type="number" min="0" value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="remote"
            type="checkbox"
            checked={form.isRemote}
            onChange={(e) => setForm({ ...form, isRemote: e.target.checked })}
            className="h-4 w-4 accent-brass"
          />
          <label htmlFor="remote" className="text-sm text-ink">
            This is remote work
          </label>
        </div>

        {!form.isRemote && (
          <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        )}
      </Card>

      <div className="flex gap-3">
        <Button type="submit" loading={submitting}>
          Post gig
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate('/gigs')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
