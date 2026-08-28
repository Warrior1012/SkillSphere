import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
        <Link to="/" className="flex items-center gap-2.5 font-display text-xl font-semibold">
          <span className="seal-ring flex h-9 w-9 items-center justify-center rounded-full bg-brass text-ink">
            <ShieldCheck size={18} strokeWidth={2.5} />
          </span>
          SkillSphere
        </Link>

        <div className="max-w-md">
          <p className="font-display text-3xl font-semibold leading-tight">
            A verified registry for local work.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-paper/70">
            Every freelancer on SkillSphere earns their credibility the same way a guild
            once granted a seal — through verified work, reviewed by the people who hired them.
          </p>
        </div>

        <p className="text-xs text-paper/40">© {new Date().getFullYear()} SkillSphere</p>

        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, var(--color-brass), transparent 70%)' }}
        />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
