import { useEffect, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, X, Upload } from 'lucide-react';
import { profileApi } from '../../services/profileApi.js';
import { uploadApi } from '../../services/uploadApi.js';
import { setUser } from '../../features/auth/authSlice.js';
import { Card, Input, Button } from '../../components/ui.jsx';

export default function EditProfilePage() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['my-profile'], queryFn: profileApi.getMine });
  const profile = data?.data?.profile;

  const [basics, setBasics] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    city: user?.location?.city || '',
    avatarUrl: user?.avatarUrl || '',
  });
  const [role, setRole] = useState({});
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  async function handleAvatarSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadApi.upload(file, 'avatars');
      setBasics((b) => ({ ...b, avatarUrl: res.data.url }));
      toast.success('Photo uploaded — save to apply');
    } catch (err) {
      if (err.response?.status === 501) {
        toast.error('File uploads need CLOUDINARY_* configured on the server — paste a URL instead for now');
      } else {
        toast.error(err.response?.data?.message || 'Upload failed');
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  useEffect(() => {
    if (!profile) return;
    if (user.role === 'freelancer') {
      setRole({ headline: profile.headline || '', bio: profile.bio || '', hourlyRate: profile.hourlyRate || 0 });
      setSkills(profile.skills || []);
    } else {
      setRole({ companyName: profile.companyName || '', industry: profile.industry || '', bio: profile.bio || '' });
    }
  }, [profile, user?.role]);

  function addSkill() {
    const name = newSkill.trim();
    if (!name || skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    setSkills([...skills, { name, proficiency: 'intermediate' }]);
    setNewSkill('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const basicsRes = await profileApi.updateBasics(basics);
      dispatch(setUser(basicsRes.data.user));

      const rolePayload = user.role === 'freelancer' ? { ...role, skills } : role;
      await profileApi.updateRoleProfile(rolePayload);

      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      toast.success('Profile updated');
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex max-w-xl flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-ink">Basics</h2>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-soft text-xl font-semibold text-ink">
            {basics.avatarUrl ? <img src={basics.avatarUrl} alt="" className="h-full w-full object-cover" /> : basics.name?.[0]}
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} loading={uploadingAvatar}>
              <Upload size={13} /> Change photo
            </Button>
            <p className="mt-1 text-xs text-slate">JPG, PNG, or WebP, up to 8MB</p>
          </div>
        </div>

        <Input label="Full name" value={basics.name} onChange={(e) => setBasics({ ...basics, name: e.target.value })} />
        <Input label="Phone" value={basics.phone} onChange={(e) => setBasics({ ...basics, phone: e.target.value })} />
        <Input label="City" value={basics.city} onChange={(e) => setBasics({ ...basics, city: e.target.value })} />
      </Card>

      {user?.role === 'freelancer' ? (
        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold text-ink">Freelancer profile</h2>
          <Input label="Headline" value={role.headline || ''} onChange={(e) => setRole({ ...role, headline: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Bio</label>
            <textarea
              rows={4}
              value={role.bio || ''}
              onChange={(e) => setRole({ ...role, bio: e.target.value })}
              className="rounded-lg border border-slate/30 bg-paper-raised px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
            />
          </div>
          <Input
            label="Hourly rate (USD)"
            type="number"
            min="0"
            value={role.hourlyRate || 0}
            onChange={(e) => setRole({ ...role, hourlyRate: Number(e.target.value) })}
          />

          <div>
            <label className="text-sm font-medium text-ink">Skills</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s.name} className="flex items-center gap-1 rounded-full bg-pine-soft px-2.5 py-1 text-xs text-pine">
                  {s.name}
                  <button type="button" onClick={() => setSkills(skills.filter((x) => x.name !== s.name))}>
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
                placeholder="Add a skill…"
                className="flex-1 rounded-lg border border-slate/30 bg-paper-raised px-3.5 py-2 text-sm outline-none focus:border-brass"
              />
              <Button type="button" variant="outline" onClick={addSkill}>
                <Plus size={14} />
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold text-ink">Company profile</h2>
          <Input
            label="Company name"
            value={role.companyName || ''}
            onChange={(e) => setRole({ ...role, companyName: e.target.value })}
          />
          <Input label="Industry" value={role.industry || ''} onChange={(e) => setRole({ ...role, industry: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink">Bio</label>
            <textarea
              rows={4}
              value={role.bio || ''}
              onChange={(e) => setRole({ ...role, bio: e.target.value })}
              className="rounded-lg border border-slate/30 bg-paper-raised px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
            />
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate('/profile')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
