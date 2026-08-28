import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShieldCheck,
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  CreditCard,
  User,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { authApi } from '../services/authApi.js';
import { setAccessToken } from '../services/apiClient.js';
import { disconnectSocket } from '../services/socket.js';
import { clearAuth } from '../features/auth/authSlice.js';
import { Badge } from '../components/ui.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import toast from 'react-hot-toast';

const ROLE_ACCENT = {
  client: { dot: 'bg-clay', label: 'Client', tone: 'clay' },
  freelancer: { dot: 'bg-pine', label: 'Freelancer', tone: 'pine' },
  admin: { dot: 'bg-brass', label: 'Admin', tone: 'brass' },
};

const NAV_BY_ROLE = {
  client: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/gigs', label: 'Marketplace', icon: Briefcase },
    { to: '/gigs/mine', label: 'My Gigs', icon: Briefcase },
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/payments', label: 'Payments', icon: CreditCard },
  ],
  freelancer: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/gigs', label: 'Find Work', icon: Briefcase },
    { to: '/proposals/mine', label: 'My Proposals', icon: Briefcase },
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/payments', label: 'Earnings', icon: CreditCard },
  ],
  admin: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/flagged-reviews', label: 'Flagged Reviews', icon: Briefcase },
    { to: '/admin/disputes', label: 'Disputes', icon: MessageSquare },
  ],
};

export default function DashboardLayout() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const accent = ROLE_ACCENT[user?.role] || ROLE_ACCENT.client;
  const navItems = NAV_BY_ROLE[user?.role] || [];

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // even if the network call fails, clear local session state
    }
    setAccessToken(null);
    disconnectSocket();
    dispatch(clearAuth());
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col justify-between bg-ink p-5 text-paper md:flex">
        <div>
          <div className="mb-8 flex items-center gap-2.5 px-1 font-display text-lg font-semibold">
            <span className="seal-ring flex h-8 w-8 items-center justify-center rounded-full bg-brass text-ink">
              <ShieldCheck size={16} strokeWidth={2.5} />
            </span>
            SkillSphere
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon, end, soon }) => (
              <NavLink
                key={to}
                to={soon ? '#' : to}
                end={end}
                onClick={(e) => soon && e.preventDefault()}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive ? 'bg-paper text-ink font-medium' : 'text-paper/70 hover:bg-ink-soft hover:text-paper'
                  } ${soon ? 'cursor-default opacity-50' : ''}`
                }
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={16} />
                  {label}
                </span>
                {soon && <span className="text-[10px] uppercase tracking-wide">soon</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-1">
          <NavLink
            to="/settings/security"
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive ? 'bg-paper text-ink font-medium' : 'text-paper/70 hover:bg-ink-soft hover:text-paper'
              }`
            }
          >
            <Settings size={16} />
            Security
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-paper/70 transition-colors hover:bg-ink-soft hover:text-paper"
          >
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-slate/15 bg-paper-raised px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
            <Badge tone={accent.tone}>{accent.label}</Badge>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <NavLink to="/profile" className="flex items-center gap-2.5 text-sm font-medium text-ink">
              <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-soft text-ink">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={16} />
                )}
              </span>
              {user?.name}
            </NavLink>
          </div>
        </header>

        <main className="flex-1 bg-paper p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
