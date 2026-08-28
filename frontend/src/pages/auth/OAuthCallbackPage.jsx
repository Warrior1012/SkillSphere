import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAccessToken } from '../../services/apiClient.js';
import { connectSocket } from '../../services/socket.js';
import { authApi } from '../../services/authApi.js';
import { setUser } from '../../features/auth/authSlice.js';
import { Spinner } from '../../components/ui.jsx';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      navigate('/login?error=google');
      return;
    }
    setAccessToken(token);
    connectSocket(token);
    authApi
      .me()
      .then((res) => {
        dispatch(setUser(res.data.user));
        navigate('/dashboard', { replace: true });
      })
      .catch(() => navigate('/login?error=google'));
  }, [params, navigate, dispatch]);

  return <Spinner />;
}
