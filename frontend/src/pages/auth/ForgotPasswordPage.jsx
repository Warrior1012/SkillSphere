import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { authApi } from '../../services/authApi.js';
import { Button, Input, Alert } from '../../components/ui.jsx';

const schema = z.object({ email: z.string().email('Enter a valid email') });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      await authApi.forgotPassword(values.email);
    } finally {
      setSubmitting(false);
      setSent(true); // same UX whether or not the account exists — the API never reveals that
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-6">
        <Alert type="success">If that email is registered, a reset link is on its way (check the server console in dev).</Alert>
        <Link to="/login" className="text-sm font-medium text-brass hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Reset your password</h1>
        <p className="mt-1 text-sm text-slate">We'll email you a link to set a new one.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Button type="submit" loading={submitting}>
          Send reset link
        </Button>
      </form>
      <Link to="/login" className="text-sm text-slate hover:text-ink">
        ← Back to login
      </Link>
    </div>
  );
}
