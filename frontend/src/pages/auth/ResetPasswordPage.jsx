import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../services/authApi.js';
import { Button, Input, Alert } from '../../components/ui.jsx';

const schema = z.object({
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Needs an uppercase letter')
    .regex(/[a-z]/, 'Needs a lowercase letter')
    .regex(/[0-9]/, 'Needs a number'),
});

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    setServerError('');
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, values.password);
      toast.success('Password reset — log in with your new password');
      navigate('/login');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Link is invalid or expired');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Set a new password</h1>
      </div>
      {serverError && (
        <Alert type="error">
          {serverError}{' '}
          <Link to="/forgot-password" className="underline">
            Request a new link
          </Link>
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="New password" type="password" error={errors.password?.message} {...register('password')} />
        <Button type="submit" loading={submitting}>
          Reset password
        </Button>
      </form>
    </div>
  );
}
