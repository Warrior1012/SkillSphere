import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { authApi } from '../../services/authApi.js';
import { setUser } from '../../features/auth/authSlice.js';
import { Card, Button, Input, Alert } from '../../components/ui.jsx';

export default function SecuritySettingsPage() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();

  const [setupData, setSetupData] = useState(null); // { qrCode, secret }
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    try {
      const res = await authApi.setup2FA();
      setSetupData(res.data);
    } catch {
      toast.error('Could not start 2FA setup');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.enable2FA(code);
      dispatch(setUser({ ...user, twoFactorEnabled: true }));
      setSetupData(null);
      setCode('');
      toast.success('2FA enabled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await authApi.disable2FA();
      dispatch(setUser({ ...user, twoFactorEnabled: false }));
      toast.success('2FA disabled');
    } catch {
      toast.error('Could not disable 2FA');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Security</h1>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${user?.twoFactorEnabled ? 'bg-pine-soft text-pine' : 'bg-slate-soft text-slate'}`}>
            {user?.twoFactorEnabled ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
          </span>
          <div>
            <p className="text-sm font-medium text-ink">Two-factor authentication</p>
            <p className="text-xs text-slate">{user?.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</p>
          </div>
        </div>

        {user?.twoFactorEnabled ? (
          <Button variant="outline" onClick={disable} loading={busy}>
            Disable 2FA
          </Button>
        ) : setupData ? (
          <form onSubmit={confirmEnable} className="flex flex-col gap-4">
            <Alert type="info">Scan this QR code with your authenticator app, then enter the 6-digit code.</Alert>
            <img src={setupData.qrCode} alt="2FA QR code" className="mx-auto h-40 w-40 rounded-lg border border-slate/20" />
            <p className="text-center font-mono text-xs text-slate">{setupData.secret}</p>
            <Input label="6-digit code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
            <Button type="submit" loading={busy}>
              Confirm & enable
            </Button>
          </form>
        ) : (
          <Button onClick={startSetup} loading={busy}>
            Set up 2FA
          </Button>
        )}
      </Card>
    </div>
  );
}
