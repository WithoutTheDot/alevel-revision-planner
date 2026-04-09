import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import LoginCard from '../components/homepage/LoginCard';
import { friendlyAuthError } from '../lib/authErrors';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const dark = theme === 'dark';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        const cred = await login(email, password);
        navigate(cred.user.emailVerified ? '/dashboard' : '/verify-email');
      } else {
        await register(email, password);
        navigate('/verify-email');
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginCard
      tab={tab}
      setTab={(t) => { setTab(t); setError(''); }}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      dark={dark}
      setDark={(d) => setTheme(d ? 'dark' : 'light')}
    />
  );
}
