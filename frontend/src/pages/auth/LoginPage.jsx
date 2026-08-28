import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';

import { authApi } from '../../services/authApi.js';
import { setAccessToken } from '../../services/apiClient.js';
import { connectSocket } from '../../services/socket.js';
import { setUser } from '../../features/auth/authSlice.js';
import { Button, Input, Alert } from '../../components/ui.jsx';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const [twoFA, setTwoFA] = useState(null); // { tempToken } once server asks for a code
  const [code, setCode] = useState('');
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    setServerError('');
    setSubmitting(true);
    try {
      const res = await authApi.login(values);
      if (res.data.requires2FA) {
        setTwoFA({ tempToken: res.data.tempToken });
      } else {
        setAccessToken(res.data.accessToken);
        connectSocket(res.data.accessToken);
        dispatch(setUser(res.data.user));
        toast.success('Welcome back');
        navigate(from, { replace: true });
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function submit2FA(e) {
    e.preventDefault();
    setServerError('');
    setSubmitting(true);
    try {
      const res = await authApi.verify2FALogin({ tempToken: twoFA.tempToken, code });
      setAccessToken(res.data.accessToken);
      connectSocket(res.data.accessToken);
      dispatch(setUser(res.data.user));
      toast.success('Welcome back');
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.response?.data?.message || 'Invalid code');
    } finally {
      setSubmitting(false);
    }
  }

  if (twoFA) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Enter your 2FA code</h1>
          <p className="mt-1 text-sm text-slate">Open your authenticator app and enter the 6-digit code.</p>
        </div>
        {serverError && <Alert type="error">{serverError}</Alert>}
        <form onSubmit={submit2FA} className="flex flex-col gap-4">
          <Input
            label="6-digit code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
          <Button type="submit" loading={submitting}>
            Verify
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Log in</h1>
        <p className="mt-1 text-sm text-slate">
          New here?{' '}
          <Link to="/register" className="font-medium text-brass hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      {serverError && <Alert type="error">{serverError}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-slate hover:text-ink">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={submitting}>
          Log in
        </Button>
      </form>
    </div>
  );
}
