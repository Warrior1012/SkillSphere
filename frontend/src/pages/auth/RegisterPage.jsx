import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Briefcase, Building2 } from 'lucide-react';

import { authApi } from '../../services/authApi.js';
import { Button, Input, Alert } from '../../components/ui.jsx';

const schema = z.object({
  name: z.string().min(2, 'Name is too short'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Needs an uppercase letter')
    .regex(/[a-z]/, 'Needs a lowercase letter')
    .regex(/[0-9]/, 'Needs a number'),
  role: z.enum(['client', 'freelancer']),
});

export default function RegisterPage() {
  const [serverError, setServerError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { role: 'client' } });

  const role = watch('role');

  async function onSubmit(values) {
    setServerError('');
    setSubmitting(true);
    try {
      await authApi.register(values);
      setSubmitted(true);
      toast.success('Account created');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-6">
        <Alert type="success">
          Account created. Check your email (or the server console, in dev) for a verification link.
        </Alert>
        <Button onClick={() => navigate('/login')}>Go to login</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-slate">
          Already have one?{' '}
          <Link to="/login" className="font-medium text-brass hover:underline">
            Log in
          </Link>
        </p>
      </div>

      {serverError && <Alert type="error">{serverError}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-3">
              <RoleCard
                icon={Building2}
                label="Client"
                sub="I want to hire"
                active={field.value === 'client'}
                onClick={() => field.onChange('client')}
              />
              <RoleCard
                icon={Briefcase}
                label="Freelancer"
                sub="I want to work"
                active={field.value === 'freelancer'}
                onClick={() => field.onChange('freelancer')}
              />
            </div>
          )}
        />

        <Input label="Full name" error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />

        <Button type="submit" loading={submitting}>
          Create {role === 'client' ? 'client' : 'freelancer'} account
        </Button>
      </form>
    </div>
  );
}

function RoleCard({ icon: Icon, label, sub, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
        active ? 'border-brass bg-brass-soft/30' : 'border-slate/25 hover:border-slate/50'
      }`}
    >
      <Icon size={20} className={active ? 'text-brass' : 'text-slate'} />
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-slate">{sub}</p>
      </div>
    </button>
  );
}
